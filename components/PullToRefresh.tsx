'use client';

import { ReactNode } from 'react';

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
		<div className="relative">
			{/* Pull indicator */}
			{shouldShow && (
				<div
					className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 transition-transform duration-200"
					style={{
						transform: `translateY(${Math.max(0, pullDistance - 60)}px)`,
						opacity: progress,
					}}
				>
					<div className="bg-white rounded-full shadow-lg p-3">
						{isRefreshing ? (
							<div className="h-6 w-6 animate-spin rounded-full border-3 border-blue-500 border-t-transparent" />
						) : (
							<svg
								className="h-6 w-6 text-blue-500 transition-transform"
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

