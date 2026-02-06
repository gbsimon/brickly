"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import styles from "./HelpPopup.module.scss"

interface HelpPopupProps {
	storageKey?: string // Optional custom storage key (kept for compatibility but not used)
}

export default function HelpPopup({ storageKey = "help-dismissed" }: HelpPopupProps) {
	const t = useTranslations("help")
	const [isOpen, setIsOpen] = useState(false)

	const handleToggle = () => {
		setIsOpen(!isOpen)
	}

	const handleClose = () => {
		setIsOpen(false)
	}

	const handleEmailClick = () => {
		window.location.href = `mailto:brickly@tomtom.design?subject=${encodeURIComponent("Brickly - Question/Comment/Feature Request")}`
	}

	// Close on Escape key
	useEffect(() => {
		if (!isOpen) return

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsOpen(false)
			}
		}

		document.addEventListener("keydown", handleEscape)
		return () => {
			document.removeEventListener("keydown", handleEscape)
		}
	}, [isOpen])

	return (
		<div className={styles.container}>
			{/* Help Button */}
			<button
				onClick={handleToggle}
				className={styles.helpButton}
				aria-label={t("buttonLabel")}
				type="button"
			>
				<svg className={styles.helpIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</button>

			{/* Popover */}
			{isOpen && (
				<>
					{/* Backdrop */}
					<div className={styles.backdrop} onClick={handleClose} />

					{/* Popover Content */}
					<div className={styles.popover}>
						<div className={styles.header}>
							<h3 className={styles.title}>{t("title")}</h3>
							<button
								onClick={handleClose}
								className={styles.closeButton}
								aria-label={t("close")}
								type="button"
							>
								<svg className={styles.closeIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>

						<div className={styles.content}>
							<div className={styles.tips}>
								<h4 className={styles.tipsTitle}>{t("tipsTitle")}</h4>
								<ul className={styles.tipsList}>
									<li>{t("tip1")}</li>
									<li>{t("tip2")}</li>
									<li>{t("tip3")}</li>
									<li>{t("tip4")}</li>
								</ul>
							</div>

							<div className={styles.contact}>
								<p className={styles.contactText}>{t("contactText")}</p>
								<a
									href="mailto:brickly@tomtom.design?subject=Brickly%20-%20Question/Comment/Feature%20Request"
									onClick={handleEmailClick}
									className={styles.emailLink}
								>
									brickly@tomtom.design
								</a>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	)
}

