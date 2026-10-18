import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Crash test caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isTestCrash = this.state.error?.message?.includes('UJIAN KEMALANGAN');

      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#0a0b10] text-white">
          <div className="max-w-md w-full p-8 rounded-3xl bg-[#12141e] border-2 border-amber-500/40 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold font-serif-vintage text-amber-200">
              {isTestCrash ? 'Ujian Kemalangan (Crash Test)' : 'Penyelarasan Sambungan Pelayan'}
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isTestCrash
                ? 'Aplikasi sengaja dicetuskan ralat kemalangan (test crash) oleh panel pentadbir bagi menguji perlindungan ralat.'
                : 'Sistem mengalami gangguan sementara akibat kesesakan sambungan rangkaian. Semua data cabutan dan tiket anda kekal selamat.'}
            </p>

            <button
              onClick={this.handleReset}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 font-bold text-xs shadow-lg hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Muat Semula Halaman (Segarkan)</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
