<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import DesignTokens from './DesignTokens.svelte';

  const { Story } = defineMeta({
    title: 'Design System/Design Tokens',
    component: DesignTokens,
    tags: ['autodocs'],
    parameters: {
      layout: 'fullscreen',
    },
  });
</script>

<Story name="Default" />

