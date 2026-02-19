#!/usr/bin/env node --import tsx
/**
 * Slide Deck — Terminal presentation viewer.
 *
 * Usage:
 *   node --import tsx examples/slide-deck/index.tsx [start-slide]
 *
 * start-slide is 1-indexed (default: 1)
 */

import React from 'react';
import { render } from 'ink';
import { SlideViewer } from './SlideViewer.js';
import { slides } from './slides.js';

const startSlide = Math.max(0, parseInt(process.argv[2] || '1', 10) - 1);

const { unmount, waitUntilExit } = render(
  <SlideViewer
    slides={slides}
    appName="slide-deck"
    startSlide={startSlide}
    onExit={() => {
      unmount();
      process.exit(0);
    }}
  />
);

waitUntilExit().then(() => process.exit(0));
