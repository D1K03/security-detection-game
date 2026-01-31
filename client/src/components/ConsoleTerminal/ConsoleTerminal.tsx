import Editor from '@monaco-editor/react';
import type { Language } from '../../types';
import './ConsoleTerminal.css';

interface ConsoleTerminalProps {
  code: string;
  language: Language;
  systemName?: string;
  highlightLine?: number;
}

// Map our language types to Monaco language IDs
const LANGUAGE_MAP: Record<Language, string> = {
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  go: 'go',
  php: 'php',
};

export function ConsoleTerminal({
  code,
  language,
  systemName,
  highlightLine,
}: ConsoleTerminalProps) {
  const monacoLanguage = LANGUAGE_MAP[language];

  const handleEditorMount = (editor: unknown) => {
    // Highlight the vulnerable line if specified
    if (highlightLine && highlightLine > 0) {
      const monacoEditor = editor as {
        deltaDecorations: (oldDecorations: string[], newDecorations: { range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }; options: { isWholeLine: boolean; className: string; glyphMarginClassName?: string } }[]) => string[];
        revealLineInCenter: (line: number) => void;
      };
      monacoEditor.deltaDecorations(
        [],
        [
          {
            range: {
              startLineNumber: highlightLine,
              startColumn: 1,
              endLineNumber: highlightLine,
              endColumn: 1,
            },
            options: {
              isWholeLine: true,
              className: 'vulnerable-line-highlight',
              glyphMarginClassName: 'vulnerable-line-glyph',
            },
          },
        ]
      );
      monacoEditor.revealLineInCenter(highlightLine);
    }
  };

  return (
    <div className="console-terminal">
      {/* Terminal header */}
      <div className="terminal-header">
        <div className="terminal-controls">
          <span className="control-dot red" />
          <span className="control-dot yellow" />
          <span className="control-dot green" />
        </div>
        <div className="terminal-title">
          {systemName ? `${systemName.toLowerCase()}_system.${language === 'python' ? 'py' : language === 'java' ? 'java' : language === 'go' ? 'go' : language === 'php' ? 'php' : 'js'}` : 'code_analysis.log'}
        </div>
        <div className="terminal-badge">{language.toUpperCase()}</div>
      </div>

      {/* Monaco Editor */}
      <div className="terminal-editor">
        <Editor
          height="100%"
          language={monacoLanguage}
          value={code}
          theme="vs-dark"
          onMount={handleEditorMount}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
            fontLigatures: true,
            lineNumbers: 'on',
            lineNumbersMinChars: 3,
            glyphMargin: true,
            folding: false,
            lineDecorationsWidth: 10,
            renderLineHighlight: 'none',
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            contextmenu: false,
            selectOnLineNumbers: false,
            roundedSelection: false,
            cursorStyle: 'line',
            cursorBlinking: 'blink',
            smoothScrolling: true,
            padding: { top: 16, bottom: 16 },
            wordWrap: 'on',
          }}
        />
      </div>

      {/* Scanline effect overlay */}
      <div className="terminal-scanlines" />

      {/* Corner decorations */}
      <div className="corner-decor top-left" />
      <div className="corner-decor top-right" />
      <div className="corner-decor bottom-left" />
      <div className="corner-decor bottom-right" />
    </div>
  );
}
