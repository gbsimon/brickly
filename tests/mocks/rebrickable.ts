// Mock data for Rebrickable API responses

export const mockSetSearchResponse = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      set_num: '21322-1',
      name: 'Test Set 1',
      year: 2020,
      num_parts: 100,
      set_img_url: 'https://example.com/set1.jpg',
      set_url: 'https://rebrickable.com/sets/21322-1',
      theme_id: 1,
    },
    {
      set_num: '21323-1',
      name: 'Test Set 2',
      year: 2021,
      num_parts: 200,
      set_img_url: 'https://example.com/set2.jpg',
      set_url: 'https://rebrickable.com/sets/21323-1',
      theme_id: 1,
    },
  ],
};

export const mockSetDetail = {
  set_num: '21322-1',
  name: 'Test Set 1',
  year: 2020,
  num_parts: 100,
  set_img_url: 'https://example.com/set1.jpg',
  set_url: 'https://rebrickable.com/sets/21322-1',
  theme_id: 1,
  last_modified_dt: '2020-01-01T00:00:00Z',
};

export const mockSetPartsResponse = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 1,
      inv_part_id: 1,
      part: {
        part_num: '3001',
        name: 'Brick 2x4',
        part_url: 'https://rebrickable.com/parts/3001',
        part_img_url: 'https://example.com/part1.jpg',
      },
      color: {
        id: 1,
        name: 'Red',
        rgb: 'FF0000',
        is_trans: false,
      },
      quantity: 2,
      is_spare: false,
    },
    {
      id: 2,
      inv_part_id: 2,
      part: {
        part_num: '3002',
        name: 'Brick 2x3',
        part_url: 'https://rebrickable.com/parts/3002',
        part_img_url: 'https://example.com/part2.jpg',
      },
      color: {
        id: 2,
        name: 'Blue',
        rgb: '0000FF',
        is_trans: false,
      },
      quantity: 1,
      is_spare: false,
    },
  ],
};

