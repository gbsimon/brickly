// Mappers to convert Rebrickable responses to simplified DTOs

import type {
  RebrickableSet,
  RebrickableSetDetail,
  RebrickablePart,
  SetSearchResult,
  SetDetail,
  SetPart,
} from './types';

export function mapSetToSearchResult(set: RebrickableSet): SetSearchResult {
  return {
    setNum: set.set_num,
    name: set.name,
    year: set.year,
    numParts: set.num_parts,
    imageUrl: set.set_img_url,
    themeId: set.theme_id,
  };
}

export function mapSetDetail(set: RebrickableSetDetail): SetDetail {
  return {
    setNum: set.set_num,
    name: set.name,
    year: set.year,
    numParts: set.num_parts,
    imageUrl: set.set_img_url,
    themeId: set.theme_id,
  };
}

export function mapPart(part: RebrickablePart): SetPart {
  return {
    partNum: part.part.part_num,
    partName: part.part.name || part.part.part_num,
    colorId: part.color.id,
    colorName: part.color.name,
    quantity: part.quantity,
    imageUrl: part.part.part_img_url,
    isSpare: part.is_spare,
  };
}

