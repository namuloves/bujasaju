'use client';

// Dev-only: the css-spec overlay plus its stylesheet. Kept in its own module
// so the ~29KB stylesheet is only pulled in when DevTools dynamically imports
// this file (never in production). Importing "css-spec/style.css" from
// app/layout.tsx shipped it to every visitor.
import 'css-spec/style.css';
import { DesignSpecOverlay } from 'css-spec/client';

export default DesignSpecOverlay;
