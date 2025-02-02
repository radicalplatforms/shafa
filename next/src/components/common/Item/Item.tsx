import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { Layers, Shirt, Crown, Footprints } from 'lucide-react'
import { PiPantsFill } from 'react-icons/pi'

export const itemTypeIcons = {
  layer: Layers,
  top: Shirt,
  bottom: PiPantsFill,
  footwear: Footprints,
  accessory: Crown,
} as const

type ItemType = keyof typeof itemTypeIcons

@customElement('shafa-item')
export class Item extends LitElement {

  @property({ type: String })
  name!: string
    
  @property({ type: String })
  brand!: string

  @property({ type: String })
  itemType!: ItemType

  @property({ type: Date })
  lastWornAt?: Date

  @property({ type: Boolean })
  isCoreItem = false

  static styles = css`
    :host {
      display: block;
    }
    .item-container {
      display: flex;
      align-items: start;
      gap: 12px;
      min-width: 0;
      max-width: 100%;
    }
    .icon-container {
      flex-shrink: 0;
      padding: 5px;
      border-radius: 4px;
      background-color: #374151;
      color: white;
      margin-top: 2px;
    }
    .icon {
      height: 17.5px;
      width: 17.5px;
    }
    .content {
      flex: 1;
      min-width: 0;
    }
    .name {
      font-weight: 500;
      line-height: 18px;
      margin: 0;
    }
    .core-indicator {
      margin-left: 4px;
      font-size: 0.75rem;
      vertical-align: top;
    }
    .brand {
      font-size: 0.75rem;
      color: #6b7280;
      margin: -0.05rem 0 0 0;
    }
    .brand i {
      font-style: italic;
    }
    .metadata-dot {
      font-size: 0.75rem;
      vertical-align: top;
      margin: 0 6px 0 5px;
    }
  `

  render() {
    const IconComponent = itemTypeIcons[this.itemType];
    
    return html`
      <div class="item-container">
        <div class="icon-container">
          <IconComponent class="icon" />
        </div>
        <div class="content">
          <p class="name">
            ${this.name}
            ${this.isCoreItem ? html`<span class="core-indicator">•</span>` : ''}
          </p>
          <p class="brand">
            ${this.brand ? this.brand : html`<i>Unbranded</i>`}
            ${this.lastWornAt ? html`
              <span>
                <span class="metadata-dot">•</span>
                Worn ${this._formatLastWorn(this.lastWornAt)}
              </span>
            ` : ''}
          </p>
        </div>
      </div>
    `
  }

  private _formatLastWorn(date: Date): string {
    // Note: You'll need to implement DateTime functionality
    // This is a placeholder for the relative date formatting
    return new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' })
      .format(-Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)), 'day');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'item': Item
  }
}