<script lang="ts">
  import { onMount } from 'svelte';

  type TokenCategory = 'color' | 'radius' | 'size';

  type Token = {
    name: string;
    variable: string;
    description: string;
    category: TokenCategory;
  };

  const tokens: Token[] = [
    { name: 'primary', variable: '--color-primary', description: 'Primary brand color', category: 'color' },
    { name: 'primary-content', variable: '--color-primary-content', description: 'Foreground content on primary', category: 'color' },
    { name: 'secondary', variable: '--color-secondary', description: 'Secondary brand color', category: 'color' },
    { name: 'secondary-content', variable: '--color-secondary-content', description: 'Foreground content on secondary', category: 'color' },
    { name: 'accent', variable: '--color-accent', description: 'Accent brand color', category: 'color' },
    { name: 'accent-content', variable: '--color-accent-content', description: 'Foreground content on accent', category: 'color' },
    { name: 'neutral', variable: '--color-neutral', description: 'Neutral color for unsaturated UI', category: 'color' },
    { name: 'neutral-content', variable: '--color-neutral-content', description: 'Foreground content on neutral', category: 'color' },
    { name: 'base-100', variable: '--color-base-100', description: 'Base surface color', category: 'color' },
    { name: 'base-200', variable: '--color-base-200', description: 'Darker base for elevation', category: 'color' },
    { name: 'base-300', variable: '--color-base-300', description: 'Darkest base for elevation', category: 'color' },
    { name: 'base-content', variable: '--color-base-content', description: 'Foreground content on base', category: 'color' },
    { name: 'info', variable: '--color-info', description: 'Informational messages', category: 'color' },
    { name: 'info-content', variable: '--color-info-content', description: 'Foreground content on info', category: 'color' },
    { name: 'success', variable: '--color-success', description: 'Success messages', category: 'color' },
    { name: 'success-content', variable: '--color-success-content', description: 'Foreground content on success', category: 'color' },
    { name: 'warning', variable: '--color-warning', description: 'Warning messages', category: 'color' },
    { name: 'warning-content', variable: '--color-warning-content', description: 'Foreground content on warning', category: 'color' },
    { name: 'error', variable: '--color-error', description: 'Error messages', category: 'color' },
    { name: 'error-content', variable: '--color-error-content', description: 'Foreground content on error', category: 'color' },
    { name: 'radius-selector', variable: '--radius-selector', description: 'Radius for checkbox, toggle, badge', category: 'radius' },
    { name: 'radius-field', variable: '--radius-field', description: 'Radius for input, select, tab', category: 'radius' },
    { name: 'radius-box', variable: '--radius-box', description: 'Radius for card, modal, alert', category: 'radius' },
    { name: 'size-selector', variable: '--size-selector', description: 'Scale for checkbox, toggle, badge', category: 'size' },
    { name: 'size-field', variable: '--size-field', description: 'Scale for input, select, tab', category: 'size' },
    { name: 'border', variable: '--border', description: 'Border width', category: 'size' },
    { name: 'depth', variable: '--depth', description: 'Shadow effects (binary)', category: 'size' },
    { name: 'noise', variable: '--noise', description: 'Background noise (binary)', category: 'size' },
  ];

  const categoryLabels: Record<TokenCategory, string> = {
    color: 'Colors',
    radius: 'Border Radius',
    size: 'Size & Effects',
  };

  let computedValues = $state<Record<string, string>>({});

  onMount(() => {
    const styles = getComputedStyle(document.documentElement);
    const values: Record<string, string> = {};
    for (const token of tokens) {
      values[token.variable] = styles.getPropertyValue(token.variable).trim();
    }
    computedValues = values;
  });

  function renderSwatch(token: Token): 'color' | 'radius' | 'size-selector' | 'size-field' | 'border' | 'none' {
    if (token.category === 'color') return 'color';
    if (token.category === 'radius') return 'radius';
    if (token.name === 'size-selector') return 'size-selector';
    if (token.name === 'size-field') return 'size-field';
    if (token.name === 'border') return 'border';
    return 'none';
  }
</script>

<div class="design-tokens">
  <header>
    <h1>Design Tokens</h1>
  </header>

  <table>
    <tbody>
      {#each tokens as token, i}
        {#if i === 0 || tokens[i - 1].category !== token.category}
          <tr class="section-row">
            <td colspan="4">{categoryLabels[token.category]}</td>
          </tr>
        {/if}
        {@const swatchType = renderSwatch(token)}
        <tr>
          <td class="col-name">
            {#if swatchType === 'color'}
              <span class="swatch" style="background: var({token.variable});"></span>
            {:else if swatchType === 'radius'}
              <span class="swatch swatch-radius" style="border-radius: var({token.variable});"></span>
            {:else if swatchType === 'size-selector'}
              <span class="swatch swatch-size-selector"></span>
            {:else if swatchType === 'size-field'}
              <span class="swatch swatch-size-field"></span>
            {:else if swatchType === 'border'}
              <span class="swatch swatch-border"></span>
            {:else}
              <span class="swatch-placeholder"></span>
            {/if}
            <span>{token.name}</span>
          </td>
          <td><code>{token.variable}</code></td>
          <td><code>{computedValues[token.variable] ?? ''}</code></td>
          <td class="col-description">{token.description}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .design-tokens {
    padding: 3rem 2rem;
    background: var(--color-base-100);
    color: var(--color-base-content);
    min-height: 100vh;
    font-family: var(--font-sans);
    max-width: 1100px;
    margin: 0 auto;
  }

  header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    font-family: var(--font-serif);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  td {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    border-bottom: 1px solid var(--color-base-200);
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }

  .section-row td {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-accent);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding-top: 2rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-base-300);
  }

  .col-name {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    white-space: nowrap;
  }

  code {
    font-family: monospace;
    font-size: 0.65rem;
    color: var(--color-accent);
    background-color: var(--color-base-200);
    border: var(--border) solid var(--color-base-300);
    padding: 0.175rem 0.4rem;
    border-radius: var(--radius-field);
  }

  .col-description {
    color: var(--color-accent);
    font-size: 0.8125rem;
  }

  .swatch {
    width: 20px;
    height: 20px;
    border-radius: var(--radius-field);
    border: var(--border) solid var(--color-base-300);
    flex-shrink: 0;
  }

  .swatch-placeholder {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .swatch-radius {
    background: var(--color-primary);
  }

  .swatch-size-selector {
    background: var(--color-base-300);
    padding: var(--size-selector);
    box-sizing: content-box;
    width: calc(20px - var(--size-selector) * 2);
    height: calc(20px - var(--size-selector) * 2);
    background-clip: content-box;
    background-color: var(--color-primary);
  }

  .swatch-size-field {
    background: var(--color-base-300);
    padding: var(--size-field);
    box-sizing: content-box;
    width: calc(20px - var(--size-field) * 2);
    height: calc(20px - var(--size-field) * 2);
    background-clip: content-box;
    background-color: var(--color-primary);
  }

  .swatch-border {
    border: var(--border) solid var(--color-primary);
    background: transparent;
  }
</style>

