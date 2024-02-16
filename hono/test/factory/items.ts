export function validItem() {
  return {
    name: 'Vintage Denim Pants',
    brand: 'Levi',
    photo: 'https://example.com/',
    type: 0,
    rating: 2,
    authorUsername: 'rak3rman',
  }
}

export function invalidItem(invalidType: string) {
  if (invalidType === 'type') {
    return {
      name: 'Vintage Denim Pants',
      brand: 'Levi',
      photo: 'https://example.com/',
      type: -1,
      rating: 3,
      authorUsername: 'rak3rman',
    }
  } else if (invalidType === 'rating') {
    return {
      name: 'Vintage Denim Pants',
      brand: 'Levi',
      photo: 'https://example.com/',
      type: 0,
      rating: 6,
      authorUsername: 'rak3rman',
    }
  } else {
    return {
      name: 'Vintage Denim Pants',
      brand: 'Levi',
      photo: 'https://example.com/',
      type: -1,
      rating: 6,
      authorUsername: 'rak3rman',
    }
  }
}

export function createItem(
  name: string,
  brand: string,
  photo: string,
  type: number,
  rating: number,
  authorUsername: string
) {
  return {
    name: name,
    brand: brand,
    photo: photo,
    type: type,
    rating: rating,
    authorUsername: authorUsername,
  }
}
