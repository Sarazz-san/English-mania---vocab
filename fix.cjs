const fs = require('fs');
let code = fs.readFileSync('src/components/ErrorBoundary.tsx', 'utf8');
code = code.replace(/import React, { Component, ErrorInfo, ReactNode } from 'react';/, "import React, { ErrorInfo, ReactNode } from 'react';");
fs.writeFileSync('src/components/ErrorBoundary.tsx', code, 'utf8');
