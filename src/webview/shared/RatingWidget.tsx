import { formatRating } from './format';

export interface RatingWidgetProps {
    rating?: number;
    ratingCount?: number;
    /** Small = sidebar list; large = editor subtitle. */
    small: boolean;
    /** Reference visibility rule for the small variant (already resolved by the caller). */
    visible?: boolean;
}

function starClasses(rating: number): string[] {
    const rounded = Math.round(rating * 2) / 2;
    const stars: string[] = [];
    for (let i = 1; i <= 5; i++) {
        if (rounded >= i) {
            stars.push('codicon-star-full');
        } else if (rounded >= i - 0.5) {
            stars.push('codicon-star-half');
        } else {
            stars.push('codicon-star-empty');
        }
    }
    return stars;
}

/**
 * Reference DOM:
 * - small: `.ratings.extension-ratings.small` > `span.codicon.codicon-star-full` + `span.count`
 * - large: `span.rating.clickable` > five star codicons + ` (count)`
 */
export function RatingWidget({ rating, ratingCount, small, visible = true }: RatingWidgetProps) {
    if (small) {
        const formatted =
            visible && rating !== undefined && rating > 0 ? formatRating(rating) : '';
        return (
            <span class="ratings extension-ratings small">
                {formatted ? (
                    <>
                        <span class="codicon codicon-star-full" />
                        <span class="count">{formatted}</span>
                    </>
                ) : null}
            </span>
        );
    }

    if (rating === undefined || rating === null || rating <= 0) {
        return null;
    }

    return (
        <span class="rating clickable">
            {starClasses(rating).map((cls) => (
                <span class={`codicon ${cls}`} />
            ))}
            {ratingCount && ratingCount > 0 ? (
                <span style="padding-left: 1px"> ({ratingCount})</span>
            ) : null}
        </span>
    );
}
