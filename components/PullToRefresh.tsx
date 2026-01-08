'use client';

import { ReactNode } from 'react';
import styles from "./PullToRefresh.module.scss";

interface PullToRefreshProps {
	children: ReactNode;
	isPulling: boolean;
	pullDistance: number;
	isRefreshing: boolean;
	threshold?: number;
}

export default function PullToRefresh({
	children,
	isPulling,
	pullDistance,
	isRefreshing,
	threshold = 80,
}: PullToRefreshProps) {
	const progress = Math.min(pullDistance / threshold, 1);
	const shouldShow = isPulling || isRefreshing;

	return (
		<div className={styles.container}>
			{/* Pull indicator */}
			{shouldShow && (
				<div
					className={styles.indicator}
					style={{
						transform: `translateY(${Math.max(0, pullDistance - 60)}px)`,
						opacity: progress,
					}}
				>
					<div className={styles.bubble}>
						{isRefreshing ? (
							<div className={styles.spinner} />
						) : (
							<svg
								className={styles.arrow}
								style={{ transform: `rotate(${progress * 180}deg)` }}
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 14l-7 7m0 0l-7-7m7 7V3"
								/>
							</svg>
						)}
					</div>
				</div>
			)}

			{/* Content */}
			<div
				style={{
					transform: shouldShow ? `translateY(${pullDistance}px)` : 'translateY(0)',
					transition: isRefreshing ? 'transform 0.3s ease-out' : 'none',
				}}
			>
				{children}
			</div>
		</div>
	);
}
