import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { clearSave } from '../game/record';
import { tr } from '../i18n';
import './ErrorBoundary.css';

// Catches a render error anywhere in the app. Without it one broken screen leaves a blank page, and a broken saved
// match reloads into the same crash. Two ways out: reload, or reload without the paused match.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('X Sword crashed:', error, info.componentStack);
  }

  private reload = (dropSave: boolean) => {
    if (dropSave) clearSave();
    location.hash = '#/';
    location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="crash" role="alert">
        <h1>{tr('Something went wrong')}</h1>
        <p>{tr('X Sword ran into an unexpected problem. Reloading usually fixes it.')}</p>
        <button type="button" className="btn btn-main btn-block" onClick={() => this.reload(false)}>{tr('Reload')}</button>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => this.reload(true)}>{tr('Reload without the saved match')}</button>
        <p className="crash-hint">{tr('Use this if the same error comes back. Your stats and settings stay.')}</p>
        <code className="crash-detail">{String(error.message || error).slice(0, 200)}</code>
      </div>
    );
  }
}
