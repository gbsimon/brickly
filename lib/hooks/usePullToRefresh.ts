import { useState, useEffect, useRef } from 'react';

interface UsePullToRefreshOptions {
	onRefresh: () => Promise<void> | void;
	enabled?: boolean;
	threshold?: number; // Distance in pixels to trigger refresh
	resistance?: number; // Resistance factor (0-1) for pull distance
}

export function usePullToRefresh({
	onRefresh,
	enabled = true,
	threshold = 80,
	resistance = 0.5,
}: UsePullToRefreshOptions) {
	const [isPulling, setIsPulling] = useState(false);
	const [pullDistance, setPullDistance] = useState(0);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const startY = useRef<number | null>(null);
	const currentY = useRef<number | null>(null);
	const elementRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!enabled) return;

		const element = elementRef.current;
		if (!element) return;

		const handleTouchStart = (e: TouchEvent) => {
			// Only start pull if at the top of the scrollable area
			if (element.scrollTop === 0) {
				startY.current = e.touches[0].clientY;
				currentY.current = e.touches[0].clientY;
				setIsPulling(true);
			}
		};

		const handleTouchMove = (e: TouchEvent) => {
			if (!isPulling || startY.current === null) return;

			currentY.current = e.touches[0].clientY;
			const deltaY = currentY.current - startY.current;

			// Only allow pulling down
			if (deltaY > 0) {
				// Apply resistance after threshold
				const distance = deltaY > threshold
					? threshold + (deltaY - threshold) * resistance
					: deltaY;

				setPullDistance(distance);
				e.preventDefault(); // Prevent default scroll behavior
			}
		};

		const handleTouchEnd = async () => {
			if (!isPulling || startY.current === null) return;

			// Trigger refresh if pulled far enough
			if (pullDistance >= threshold) {
				setIsRefreshing(true);
				try {
					await onRefresh();
				} finally {
					setIsRefreshing(false);
				}
			}

			// Reset
			setIsPulling(false);
			setPullDistance(0);
			startY.current = null;
			currentY.current = null;
		};

		element.addEventListener('touchstart', handleTouchStart, { passive: false });
		element.addEventListener('touchmove', handleTouchMove, { passive: false });
		element.addEventListener('touchend', handleTouchEnd);
		element.addEventListener('touchcancel', handleTouchEnd);

		return () => {
			element.removeEventListener('touchstart', handleTouchStart);
			element.removeEventListener('touchmove', handleTouchMove);
			element.removeEventListener('touchend', handleTouchEnd);
			element.removeEventListener('touchcancel', handleTouchEnd);
		};
	}, [enabled, isPulling, pullDistance, threshold, resistance, onRefresh]);

	return {
		elementRef,
		isPulling,
		pullDistance,
		isRefreshing,
		shouldShowIndicator: pullDistance > 0 || isRefreshing,
	};
}

