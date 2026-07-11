// @ts-nocheck
import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
 children?: ReactNode;
}

interface State {
 hasError: boolean;
 error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
 public state: State = {
 hasError: false
 };

 public static getDerivedStateFromError(error: Error): State {
 return { hasError: true, error };
 }

 public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
 console.error('Uncaught error:', error, errorInfo);
 }

 public render() {
 if (this.state.hasError) {
 return (
 <div className="flex flex-col items-center justify-center h-full p-8 text-center text-danger">
 <AlertTriangle className="w-12 h-12 mb-4" />
 <h2 className="text-xl font-bold mb-2">Something went wrong.</h2>
 <p className="text-sm font-mono bg-danger-bg text-danger-text p-4 rounded-xl inline-block max-w-full overflow-auto">
 {this.state.error?.message || "An unexpected error occurred."}
 </p>
 <button 
 onClick={() => this.setState({ hasError: false, error: undefined })}
 className="mt-6 px-4 py-2 bg-surface border border-border text-text-main rounded-lg hover:bg-surface-hover"
 >
 Try Again
 </button>
 </div>
 );
 }

 return this.props.children;
 }
}
