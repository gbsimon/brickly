"use client"

import styles from "../signin/page.module.scss"
import { useTranslations } from "next-intl"

export default function VerifyRequestPage() {
	const t = useTranslations("auth.verifyRequest")

	return (
		<div className={`safe ${styles.page}`}>
			<div className={`cardSolid ${styles.card}`}>
				<div className={styles.logoWrap}>
					<img
						src="/brick.svg"
						alt="Brickly"
						className={styles.logo}
					/>
				</div>

				<h1 className={`largeTitle ${styles.title}`}>{t("title")}</h1>

				<p className={`subhead ${styles.description}`}>
					{t("description")}
				</p>

				<p className={`subhead ${styles.subtitle}`}>{t("hint")}</p>
			</div>
		</div>
	)
}
