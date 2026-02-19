"use client"

import styles from "../signin/page.module.scss"

export default function VerifyRequestPage() {
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

				<h1 className={`largeTitle ${styles.title}`}>
					Check your email
				</h1>

				<p className={`subhead ${styles.description}`}>
					A sign-in link has been sent to your email address. Click
					the link to sign in.
				</p>

				<p className={`subhead ${styles.subtitle}`}>
					If you don&apos;t see the email, check your spam folder.
				</p>
			</div>
		</div>
	)
}
