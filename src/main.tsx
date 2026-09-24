import { render } from 'preact';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/kanit/400.css';
import '@fontsource/kanit/600.css';
import '@fontsource/kanit/700.css';
import './core/ui/theme.css';
import './core/ui/components.css';
import { App } from './app/App';
import { loadPixelLabOverrides } from './core/sprites/engine';
import { applyStoredLargeTextPreference } from './core/ui/LargeTextToggle';

loadPixelLabOverrides();
applyStoredLargeTextPreference();

const root = document.getElementById('app');
if (root) render(<App />, root);
