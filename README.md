# Shafa
A wardrobe logging, composition, and organization app

# Purpose

# Stack Overview

## Next

### Outfits Library Page

- Contains grid of Outfit components
  - Grouped by composite score

### Outfits Queue Page

- 

### Items Page

## Hono

# Components

### Web Assets (shafa.app)

**Next deployed onto Cloudflare Workers**

### Logical API (api.shafa.app)

**Hono deployed onto Cloudflare Workers**

#### Items (Durable Object)

- uuid<string>: UUIDv6, unique identifier for each piece of clothing
- username<string>: username passed in header by Author
- desc<string>: very short description of item
- brand<string>: brand of item (tagging opportunity)
- photo<string>: Cloudflare Images ID
- primaryColor<string>: HEX value  (color picker?)
- pattern?
- type<string>: bottom/top/outerwear/shoes/etc
- subtype<string>: TBD
- style<string>: professional, casual, etc
- rating<int>: 0-4 likability of item
- quality<int>: 0-4 quality of item

#### Outfits (Durable Object)

- uuid<string>: UUIDv6, unique identifier for each outfit
- username<string>: username passed in header by Author
- layer<string>: ref to ITEMS, layer(ed) outfit layer
- top<string>: ref to ITEMS, top outfit layer
- bottom<string>: ref to ITEMS, bottom outfit layer
- footwear<string>: ref to ITEMS, footwear
- accessories[]<string>: array of ITEMS that can be used as accessories
- rating<int>: 0-4 likability of item

#### Users (From Author)

## Deployment

TODO

## Contributors

- **Radison Akerman** // Frontend
- **Leeza Andryushchenko** // Backend
- **Richard Yang** // Backend
- **Sengdao Inthavong** // Backend

## License
This project (shafa) is protected by the Mozilla Public License 2.0 as disclosed in the [LICENSE](https://github.com/rakermanfoundation/shafa/blob/main/LICENSE). Adherence to the policies and terms listed is required.