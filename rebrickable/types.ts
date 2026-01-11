// Rebrickable API Types

export interface RebrickableSet {
	set_num: string
	name: string
	year: number
	theme_id: number
	num_parts: number
	set_img_url: string | null
	set_url: string
	last_modified_dt: string
}

export interface RebrickableSetSearchResponse {
	count: number
	next: string | null
	previous: string | null
	results: RebrickableSet[]
}

export interface RebrickableSetDetail extends RebrickableSet {
	// Additional fields that may be in set detail endpoint
	[key: string]: unknown
}

export interface RebrickablePart {
	id: number
	inv_part_id: number
	part: {
		part_num: string
		name: string
		part_url: string
		part_img_url: string | null
	}
	color: {
		id: number
		name: string
		rgb: string
		is_trans: boolean
	}
	quantity: number
	is_spare: boolean
	element_id: string | null
	num_sets: number
}

export interface RebrickableSetPartsResponse {
	count: number
	next: string | null
	previous: string | null
	results: RebrickablePart[]
}

export type RebrickableMinifigPart = RebrickablePart

export interface RebrickableMinifig {
	id: number
	inv_minifig_id: number
	quantity: number
	set_num: string
	minifig?: {
		set_num: string
		name: string
		num_parts: number
		set_img_url: string | null
		set_url: string
	} | null
}

export interface RebrickableMinifigDetail {
	set_num: string
	name: string
	num_parts: number
	set_img_url: string | null
	set_url: string
}

export interface RebrickableSetMinifigsResponse {
	count: number
	next: string | null
	previous: string | null
	results: RebrickableMinifig[]
}

export interface RebrickableMinifigPartsResponse {
	count: number
	next: string | null
	previous: string | null
	results: RebrickableMinifigPart[]
}

// Simplified DTOs for client consumption
export interface SetSearchResult {
	setNum: string
	name: string
	year: number
	numParts: number
	imageUrl: string | null
	themeId: number
	themeName?: string // Optional - fetched separately
}

export interface RebrickableTheme {
	id: number
	name: string
	parent_id: number | null
}

export interface SetDetail {
	setNum: string
	name: string
	year: number
	numParts: number
	imageUrl: string | null
	themeId: number
	themeName?: string // Optional - fetched separately
}

export interface SetMinifig {
	setNum: string
	name: string
	quantity: number
	imageUrl: string | null
	numParts: number
}

export interface SetPart {
	partNum: string
	partName: string
	colorId: number
	colorName: string
	quantity: number
	imageUrl: string | null
	isSpare: boolean
	isMinifig?: boolean // true for minifigs, false/undefined for regular parts
}
