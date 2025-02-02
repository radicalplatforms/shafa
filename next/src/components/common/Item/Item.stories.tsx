import type { Meta, StoryObj } from '@storybook/web-components'
import { html } from 'lit'
import './Item'

const meta: Meta = {
  title: 'Components/Item',
  component: 'item',
  tags: ['autodocs'],
  argTypes: {
    name: { control: 'text' },
    brand: { control: 'text' },
    itemType: {
      control: 'select',
      options: ['layer', 'top', 'bottom', 'footwear', 'accessory']
    },
    lastWornAt: { control: 'date' },
    isCoreItem: { control: 'boolean' }
  }
}

export default meta

export const Default: StoryObj = {
  args: {
    name: 'Blue T-Shirt',
    brand: 'Nike',
    itemType: 'top',
    lastWornAt: new Date(),
    isCoreItem: false
  },
  render: (args) => html`
    <shafa-item
      name=${args.name}
      brand=${args.brand}
      itemType=${args.itemType}
      .lastWornAt=${args.lastWornAt}
      ?isCoreItem=${args.isCoreItem}
    ></item>
  `
}