import './polyfill'

import { h, Fragment, SVGProps } from 'jsx-dom'
import { logErrors } from './util'
import { AllowIframeMessage, DisallowIframeMessage, Message, PreviewMessage } from './util/messages'

browser.runtime.onMessage.addListener(
	logErrors(async (message: Message) => {
		switch (message.method) {
			case 'preview': {
				const linkUrl = new URL(message.linkUrl)
				await showSidebar(linkUrl)
			}
		}
	})
)

async function showSidebar(linkUrl: URL): Promise<void> {
	let existingSidebar = document.querySelector('#link-preview-sidebar')
	const embedderUrl = new URL(browser.runtime.getURL('/src/templates/embedder.html'))

	if (!existingSidebar) {
		const sidebar = <aside id="link-preview-sidebar" aria-label="Link preview" />
		existingSidebar = sidebar

		const onCloseClick = logErrors(
			async (): Promise<void> => {
				sidebar.remove()
				const message: DisallowIframeMessage = {
					method: 'disallowIframe',
					linkUrl: linkUrl.href,
				}
				await browser.runtime.sendMessage(message)
			}
		)

		sidebar.attachShadow({ mode: 'open', delegatesFocus: true }).append(
			<>
				<link href={browser.runtime.getURL('/src/templates/content.css')} rel="stylesheet" />
				<div className="link-preview-top-bar">
					<a
						id="link-preview-link"
						href={linkUrl.href}
						target="_blank"
						rel="noopener"
						aria-label="Previewed URL"
					>
						{linkUrl.href}
					</a>
					<button
						className="link-preview-close-button"
						type="button"
						onClick={onCloseClick}
						aria-label="Close preview"
					>
						<CloseIcon width={20} height={20} className="link-preview-close-icon" />
					</button>
				</div>
				<iframe id="link-preview-sidebar-iframe" />
			</>
		)

		document.body.append(sidebar)

		// Embed the page to be previewed in an iframe hosted by the extension. Using the context of the browser
		// extension ensures that cookies (including SameSite=Lax) are sent for the URL the same as for a full page
		// navigation, which would otherwise not be the case and would cause the preview to be broken.
		const embedderIframe = sidebar.shadowRoot!.querySelector<HTMLIFrameElement>('#link-preview-sidebar-iframe')!
		await new Promise<Event>(resolve => {
			embedderIframe.addEventListener('load', resolve, { once: true })
			embedderIframe.src = embedderUrl.href
		})
	}
	const link = existingSidebar.shadowRoot!.querySelector<HTMLAnchorElement>('#link-preview-link')!
	link.href = linkUrl.href
	link.textContent = linkUrl.href

	const embedderIframe = existingSidebar.shadowRoot!.querySelector<HTMLIFrameElement>('#link-preview-sidebar-iframe')!
	const embedderMessage: PreviewMessage = {
		method: 'preview',
		linkUrl: linkUrl.href,
	}
	embedderIframe.contentWindow!.postMessage(embedderMessage, embedderUrl.origin)
	embedderIframe.focus()
}

function CloseIcon(props: SVGProps<SVGSVGElement>): JSX.Element {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			preserveAspectRatio="xMidYMid meet"
			viewBox="0 0 24 24"
			{...props}
		>
			<path d="M13.41 12l4.3-4.29a1 1 0 1 0-1.42-1.42L12 10.59l-4.29-4.3a1 1 0 0 0-1.42 1.42l4.3 4.29l-4.3 4.29a1 1 0 0 0 0 1.42a1 1 0 0 0 1.42 0l4.29-4.3l4.29 4.3a1 1 0 0 0 1.42 0a1 1 0 0 0 0-1.42z" />
		</svg>
	)
}
