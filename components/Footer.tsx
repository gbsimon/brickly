"use client"

import { useTranslations } from "next-intl"
import packageJson from "../package.json"

export default function Footer() {
	const t = useTranslations("footer")

	return (
		<footer
			className="fixed bottom-0 right-0 p-3 sm:p-4 z-10 pointer-events-none"
			style={{
				paddingBottom: "max(12px, env(safe-area-inset-bottom))",
				paddingRight: "max(12px, env(safe-area-inset-right))",
			}}>
			<div className="flex flex-col items-end gap-1 text-xs" style={{ color: "#9ca3af" }}>
				<div>
					{t("projectFrom")}{" "}
					<a href="https://tomtom.design" target="_blank" rel="noopener noreferrer" className="underline pointer-events-auto hover:opacity-80 transition-opacity" style={{ color: "#9ca3af" }}>
						tom & tom
					</a>
				</div>
				<div>v{packageJson.version}</div>
			</div>
		</footer>
	)
}
