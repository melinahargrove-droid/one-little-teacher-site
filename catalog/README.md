# Shared One Little Teacher product cards

48 product cards on index.html, little-play.html and tiny-tools.html share assets/product-card.css. Brand collection panels remain distinct navigation panels.

Edit product-cards.json, then run `python scripts/render-product-cards.py` from repository root. The renderer updates existing cards by page + stable key. For a new card, first add an article with its data-card-key to the correct grid, then add metadata. Images live in assets/cards/<key>.webp, reused across pages. Use 4:3 watercolor art, contain-fit with safe margins. Keep the original Make Groups asset unchanged.

Status/actions and pricing are independent. Existing collection-preview cards may link to a collection, not a launched app. Available cards have the exact existing resource links; coming-soon/paid-unavailable have disabled buttons, never checkout URLs. Do not activate paid checkout through this renderer. Preserve filter attrs and IDs. Both downloadable free games/tools retain their download links.

Art is representative illustration, not an app screenshot. Keep meaningful alt text, preserve all titles/descriptions and complete price labels, and check all10 available free resource links after future edits. Future publishers must verify availability rather than infer it from presence of a file in the repository.
