const fs = require('fs');
let code = fs.readFileSync('src/components/ErrorBoundary.tsx', 'utf8');
code = code.replace(/export default class ErrorBoundary extends Component<Props, State>/, 'export default class ErrorBoundary extends React.Component<Props, State>');
fs.writeFileSync('src/components/ErrorBoundary.tsx', code, 'utf8');
