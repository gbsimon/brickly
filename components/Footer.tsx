"use client"

import { useTranslations } from "next-intl"
import packageJson from "../package.json"
import styles from "./Footer.module.scss"

export default function Footer() {
	const t = useTranslations("footer")

	return (
		<footer className={styles.footer}>
			<div className={styles.content}>
				<div>
					{t("projectFrom")}{" "}
					<a
						href="https://tomtom.design"
						target="_blank"
						rel="noopener noreferrer"
						className={styles.link}
					>
						tom & tom
					</a>
				</div>
				<div>v{packageJson.version}</div>
			</div>
		</footer>
	)
}
