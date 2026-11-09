#!/usr/bin/env python3
"""Functional browser acceptance against the isolated local Komga fixture."""

from __future__ import annotations

import hashlib
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import BrowserContext, Locator, Page, TimeoutError as PlaywrightTimeout
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / ".runtime"
CONFIG = RUNTIME / "e2e-config.json"
STATE = RUNTIME / "e2e-state.json"
EXTENSION = RUNTIME / "tampermonkey"
PROFILE = RUNTIME / f"browser-acceptance-{time.time_ns()}"
ARTIFACT = ROOT / "dist" / "komga-metadata.user.js"
BASE_URL = "http://127.0.0.1:18767"
SAFE_TITLE = "葬送のフリーレン"


class AcceptanceBlocked(RuntimeError):
    pass


def read_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise AcceptanceBlocked(f"required local test file unavailable: {path.relative_to(ROOT)}") from error
    if not isinstance(value, dict):
        raise AcceptanceBlocked(f"invalid local test file shape: {path.relative_to(ROOT)}")
    return value


def id_from(value: object, label: str) -> str:
    if isinstance(value, str) and value:
        return value
    if isinstance(value, dict):
        for key in ("id", "seriesId", "bookId"):
            candidate = value.get(key)
            if isinstance(candidate, str) and candidate:
                return candidate
    raise AcceptanceBlocked(f"missing synthetic {label} ID in e2e-state.json")


def fixture_ids(state: dict) -> tuple[str, str, list[str]]:
    series_rows = state.get("series")
    books_rows = state.get("books")
    if not isinstance(series_rows, list) or not isinstance(books_rows, list):
        raise AcceptanceBlocked("e2e-state.json does not describe the generated library")
    regular = next((row for row in series_rows if isinstance(row, dict) and row.get("oneshot") is False), None)
    one_shot = next((row for row in series_rows if isinstance(row, dict) and row.get("oneshot") is True), None)
    if regular is None or one_shot is None:
        raise AcceptanceBlocked("generated non-One-shot and One-shot series IDs are required")
    regular_id, one_shot_id = id_from(regular, "series"), id_from(one_shot, "One-shot series")
    books = [
        id_from(row, "book")
        for row in books_rows
        if isinstance(row, dict) and row.get("seriesId") == regular_id
    ]
    if len(books) != 2:
        raise AcceptanceBlocked("the generated series must have exactly two books")
    return regular_id, one_shot_id, books


def import_userscript(context: BrowserContext, extension_id: str) -> None:
    options = context.new_page()
    options.goto(f"chrome-extension://{extension_id}/options.html#nav=utilities", wait_until="domcontentloaded")
    file_input = options.locator('input[type="file"]')
    try:
        file_input.first.wait_for(state="attached", timeout=20_000)
    except PlaywrightTimeout:
        pass
    if file_input.count() == 0:
        controls = options.locator("input,button,[role=button]").evaluate_all(
            "(items) => items.map(e => ({tag:e.tagName,type:e.type||'',id:e.id||'',text:(e.innerText||e.getAttribute('aria-label')||'').slice(0,80)}))"
        )
        raise AcceptanceBlocked(
            "Tampermonkey utilities import control was not found: "
            + json.dumps({"url": options.url, "controls": controls[:20]}, ensure_ascii=False)
        )
    file_input.first.set_input_files(str(ARTIFACT))
    # The page event can fire at about:blank before ask.html navigation.
    # Inspect the live page list while allowing the event loop to advance.
    deadline = time.monotonic() + 10
    prompt = None
    while time.monotonic() < deadline:
        prompt = next((p for p in context.pages if "/ask.html" in p.url), None)
        if prompt:
            break
        options.wait_for_timeout(100)
    if prompt is None:
        raise AcceptanceBlocked("Tampermonkey did not open its userscript install confirmation")
    prompt.wait_for_load_state("domcontentloaded")
    install = prompt.get_by_role("button", name=re.compile(r"^(安装|Install|重新安装|Reinstall|Update|更新)$", re.I))
    install.first.wait_for(state="visible", timeout=10_000)
    install.first.click()
    try:
        prompt.wait_for_event("close", timeout=2_000)
    except PlaywrightTimeout:
        pass
    finally:
        options.close()


def remove_prior_acceptance_script(context: BrowserContext, extension_id: str) -> None:
    dashboard = context.new_page()
    dashboard.goto(
        f"chrome-extension://{extension_id}/options.html#nav=dashboard",
        wait_until="domcontentloaded",
    )
    dashboard.wait_for_timeout(1_500)
    row = dashboard.locator("tr.scripttr").filter(has_text="Komga 元数据")
    if row.count():
        if row.count() != 1:
            raise AcceptanceBlocked("acceptance profile contains duplicate production script entries")
        delete = row.locator(".fa-trash-alt")
        if delete.count() != 1:
            raise AcceptanceBlocked("could not identify the acceptance script's Tampermonkey delete control")
        dashboard.on("dialog", lambda dialog: dialog.accept())
        delete.click()
        try:
            row.wait_for(state="detached", timeout=10_000)
        except PlaywrightTimeout as error:
            raise AcceptanceBlocked("could not remove the prior script from the dedicated acceptance profile") from error
    dashboard.close()


def enable_imported_userscript(context: BrowserContext, extension_id: str) -> dict:
    dashboard = context.new_page()
    dashboard.goto(
        f"chrome-extension://{extension_id}/options.html#nav=dashboard",
        wait_until="domcontentloaded",
    )
    dashboard.wait_for_timeout(1_500)
    row = dashboard.locator("tr.scripttr").filter(has_text="Komga 元数据")
    row.wait_for(state="visible", timeout=10_000)
    warning = row.locator(".enabler_warning")
    was_warning = warning.count() > 0
    if was_warning:
        # A local import is marked untrusted by Tampermonkey until its owner approves it.
        warning.click()
    try:
        row.locator(".enabler_enabled, .enabler_later").wait_for(state="attached", timeout=8_000)
    except PlaywrightTimeout as error:
        raise AcceptanceBlocked("Tampermonkey did not enable the reviewed local userscript") from error
    state = {
        "listed": True,
        "wasUntrustedLocalImport": was_warning,
        "enabled": row.locator(".enabler_enabled, .enabler_later").count() > 0,
    }
    dashboard.close()
    return state


def extension_id_from(context: BrowserContext) -> str:
    workers = list(context.service_workers)
    if not workers:
        try:
            workers = [context.wait_for_event("serviceworker", timeout=20_000)]
        except PlaywrightTimeout as error:
            raise AcceptanceBlocked("Tampermonkey extension service worker did not start") from error
    match = re.match(r"chrome-extension://([a-p]{32})/", workers[0].url)
    if not match:
        raise AcceptanceBlocked("could not identify the loaded Tampermonkey extension")
    extension_id = match.group(1)
    settings = context.new_page()
    settings.goto("chrome://extensions/", wait_until="domcontentloaded")
    result = settings.evaluate(
        """async id => {
          if (!chrome.developerPrivate?.updateExtensionConfiguration) {
            return { available: false, methods: Object.keys(chrome.developerPrivate || {}) };
          }
          const before = await chrome.developerPrivate.getExtensionInfo(id);
          await chrome.developerPrivate.updateExtensionConfiguration({
            extensionId: id, userScriptsAccess: true
          });
          const info = await chrome.developerPrivate.getExtensionInfo(id);
          return {
            available: true,
            before: before?.userScriptsAccess ?? null,
            after: info?.userScriptsAccess ?? null
          };
        }""",
        extension_id,
    )
    settings.close()
    access = result.get("after")
    enabled = access is True or (
        isinstance(access, dict)
        and access.get("isActive") is True
        and access.get("isEnabled") is True
    )
    if not result.get("available") or not enabled:
        raise AcceptanceBlocked(f"Chrome user-script permission update failed: {json.dumps(result)}")
    return extension_id


def login_if_needed(page: Page, credentials: dict) -> None:
    password = page.locator('input[type="password"]:visible')
    try:
        password.first.wait_for(state="visible", timeout=8_000)
    except PlaywrightTimeout:
        response = page.evaluate(
            """async () => (await fetch('/api/v1/libraries', {credentials:'include'})).status"""
        )
        if 200 <= response < 300:
            return
        raise AcceptanceBlocked("local Komga session is not authenticated and no login form appeared")
    email = credentials.get("email")
    secret = credentials.get("password")
    if not isinstance(email, str) or not isinstance(secret, str):
        raise AcceptanceBlocked("local Komga test account is unavailable")
    text_inputs = page.locator(
        'input:visible:not([type="password"]):not([type="hidden"]):not([type="submit"])'
    )
    if text_inputs.count() == 0:
        raise AcceptanceBlocked("Komga login form has no visible account input")
    text_inputs.first.fill(email)
    password.first.fill(secret)
    submit = page.locator('button[type="submit"]:visible')
    if submit.count() == 0:
        submit = page.get_by_role("button", name=re.compile(r"登录|sign in|log in", re.I))
    if submit.count() == 0:
        raise AcceptanceBlocked("Komga login form has no submit control")
    submit.first.click()
    try:
        page.wait_for_function(
            "() => !document.querySelector('input[type=password]')",
            timeout=15_000,
        )
    except PlaywrightTimeout as error:
        raise AcceptanceBlocked("isolated Komga test account could not sign in through the UI") from error


def open_product_panel(page: Page) -> None:
    # A modal intentionally makes the background launcher inert. Reuse an
    # already-open panel rather than clicking that background control twice.
    if page.locator('#komga-metadata-panel dialog[open]').is_visible():
        return
    try:
        page.locator("#komga-metadata-launcher").wait_for(state="attached", timeout=15_000)
    except PlaywrightTimeout as error:
        markers = page.evaluate(
            """() => ({
              title: document.title,
              path: location.pathname,
              app: !!document.querySelector('#app, #__nuxt, #root'),
              scripts: [...document.querySelectorAll('script[src]')].map(e => new URL(e.src).pathname).slice(0, 12),
              apiReferences: [...document.querySelectorAll('[src],[href]')]
                .map(e => e.getAttribute('src') || e.getAttribute('href') || '')
                .filter(s => /\\/api\\/v1\\/(series|books)\\//.test(s)).length,
              launcher: !!document.querySelector('#komga-metadata-launcher')
            })"""
        )
        raise AcceptanceBlocked(
            "userscript launcher was not injected on Komga page: " + json.dumps(markers)
        ) from error
    openers = page.get_by_role("button", name=re.compile(r"元数据|metadata", re.I))
    if openers.count() == 0:
        openers = page.locator(
            '[role="button"][aria-label*="元数据"], '
            '[aria-label*="metadata" i], [title*="元数据"], [title*="metadata" i]'
        )
    if openers.count() == 0:
        raise AcceptanceBlocked("production userscript launcher has no accessible open control")
    openers.first.click()
    page.locator("#komga-metadata-panel").wait_for(state="attached", timeout=10_000)


def find_textbox(panel: Locator) -> Locator:
    fields = panel.get_by_role("textbox", name="搜索词")
    if fields.count() == 0:
        fields = panel.locator('input[type="search"], input[type="text"], textarea')
    if fields.count() == 0:
        raise AcceptanceBlocked("metadata panel has no accessible search textbox")
    return fields.first


def assert_live_search_preview(page: Page, screenshots: Path) -> None:
    open_product_panel(page)
    panel = page.locator("#komga-metadata-panel")
    for source in panel.locator('input[type="checkbox"][aria-label]').all():
        if source.get_attribute("aria-label") == "bangumi":
            source.set_checked(True)
        elif source.get_attribute("aria-label") in {"ehentai", "mangaupdates", "mangabaka", "mangadex", "anilist", "mal", "comicvine", "bookwalker", "yenpress", "viz", "webtoons"}:
            source.set_checked(False)
    query = find_textbox(panel)
    query.fill(SAFE_TITLE)
    search = panel.get_by_role("button", name=re.compile(r"^搜索$|^search$", re.I))
    if search.count() == 0:
        raise AcceptanceBlocked("metadata panel has no search action")
    search.first.click()
    try:
        panel.get_by_role("button", name=re.compile(re.escape(SAFE_TITLE))).first.wait_for(state="visible", timeout=35_000)
    except PlaywrightTimeout as error:
        diagnostic = page.evaluate("""() => ({status:[...document.querySelector('#komga-metadata-panel').shadowRoot.querySelectorAll('p[data-state]')].map(e=>e.textContent),buttons:[...document.querySelector('#komga-metadata-panel').shadowRoot.querySelectorAll('button')].map(e=>e.textContent).slice(-12)})""")
        screenshots.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(screenshots / 'search-failed.png'), full_page=True)
        diagnostic['pages'] = [p.url.split('?')[0] for p in page.context.pages]
        raise AcceptanceBlocked("live public-source search missing known title: " + json.dumps(diagnostic,ensure_ascii=False)) from error
    screenshots.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(screenshots / "live-search.png"), full_page=True)
    panel.get_by_role("button", name=re.compile(re.escape(SAFE_TITLE))).first.click()
    panel.get_by_role("heading", name=re.compile(r"bangumi\s*[·|｜]\s*" + re.escape(SAFE_TITLE), re.I)).wait_for(
        state="visible", timeout=35_000
    )
    preview = panel.get_by_role("button", name="生成预览")
    preview.click()
    panel.get_by_role("heading", name="确认更改", exact=True).wait_for(state="visible", timeout=10_000)
    page.screenshot(path=str(screenshots / "metadata-preview.png"), full_page=True)
    if panel.locator('input[aria-label="标签"]').count() == 0:
        raise AcceptanceBlocked("provider detail/preview did not expose a tags field")
    if panel.locator('input[aria-label="作者"]').count() == 0:
        raise AcceptanceBlocked("provider detail/preview did not expose authors")


def write_report(report: dict) -> None:
    output = RUNTIME / "acceptance" / "e2e-summary.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run() -> int:
    report: dict = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "target": "isolated Komga 1.30 at 127.0.0.1:18767",
        "artifact": "dist/komga-metadata.user.js",
        "status": "BLOCKED",
        "completed": [],
        "blocker": None,
    }
    try:
        if not CONFIG.is_file() or not STATE.is_file():
            raise AcceptanceBlocked("isolated local Komga test fixtures are missing")
        if not EXTENSION.is_dir() or not (EXTENSION / "manifest.json").is_file():
            raise AcceptanceBlocked("Tampermonkey extension bundle is missing")
        if not ARTIFACT.is_file():
            raise AcceptanceBlocked("production bundle is not built yet; run the project build first")
        artifact_hash = hashlib.sha256(ARTIFACT.read_bytes()).hexdigest()
        time.sleep(1)
        if hashlib.sha256(ARTIFACT.read_bytes()).hexdigest() != artifact_hash:
            raise AcceptanceBlocked("production bundle changed during the acceptance setup; rerun after build settles")
        credentials = read_json(CONFIG)
        state = read_json(STATE)
        series_id, oneshot_id, book_ids = fixture_ids(state)
        report.update(
            artifact_sha256=artifact_hash,
            fixture="generated Frieren series, two books, and One-shot",
        )
        with sync_playwright() as playwright:
            context = playwright.chromium.launch_persistent_context(
                str(PROFILE),
                channel="chromium",
                headless=True,
                locale="en-US",
                args=[
                    f"--disable-extensions-except={EXTENSION}",
                    f"--load-extension={EXTENSION}",
                ],
            )
            try:
                extension_id = extension_id_from(context)
                remove_prior_acceptance_script(context, extension_id)
                import_userscript(context, extension_id)
                report["completed"].append("actual Tampermonkey import flow")
                report["manager_state"] = enable_imported_userscript(context, extension_id)
                report["completed"].append("Tampermonkey local-source approval")
                page = context.new_page()
                page_errors: list[str] = []
                page.on("pageerror", lambda error: page_errors.append(str(error)[:160]))
                page.goto(f"{BASE_URL}/login", wait_until="domcontentloaded")
                login_if_needed(page, credentials)
                page.goto(f"{BASE_URL}/series/{series_id}", wait_until="domcontentloaded")
                try:
                    page.wait_for_function(
                        "() => !!document.querySelector('#app, #__nuxt, #root, main, [role=main]')",
                        timeout=15_000,
                    )
                except PlaywrightTimeout as error:
                    page_state = page.evaluate(
                        """() => ({
                          title: document.title,
                          path: location.pathname,
                          shell: !!document.querySelector('#app, #__nuxt, #root, main, [role=main]'),
                          passwordForm: !!document.querySelector('input[type=password]')
                        })"""
                    )
                    raise AcceptanceBlocked(
                        "isolated Komga series page did not load: " + json.dumps(page_state)
                    ) from error
                report["completed"].append("authenticated synthetic series page")
                report["page_gm_info"] = page.evaluate("typeof GM_info !== 'undefined'")
                report["page_errors"] = page_errors[:5]
                open_product_panel(page)
                report["completed"].append("production userscript detected current series")
                assert_live_search_preview(page, RUNTIME / "acceptance" / "screenshots")
                report["completed"].append("live public source search and detail preview")
                report["status"] = "PASS"
                report["notes"] = [
                    "write/readback, cover, undo, One-shot, failure and lock cases require explicit UI controls",
                    f"synthetic book count: {len(book_ids)}",
                    "One-shot fixture present" if oneshot_id else "One-shot fixture ID shape not recognized",
                ]
            finally:
                context.close()
    except AcceptanceBlocked as error:
        report["blocker"] = str(error)
    except Exception as error:  # noqa: BLE001 - record a sanitized diagnostic, never object repr/config
        report["status"] = "FAIL"
        report["blocker"] = f"{type(error).__name__}: {error}"
    write_report(report)
    print(f"{report['status']}: {report.get('blocker') or ', '.join(report['completed'])}")
    print("Sanitized report: .runtime/acceptance/e2e-summary.json")
    return 0 if report["status"] == "PASS" else 2 if report["status"] == "BLOCKED" else 1


if __name__ == "__main__":
    sys.exit(run())
