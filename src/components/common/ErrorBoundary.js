import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Unhandled UI error caught by ErrorBoundary:', error, errorInfo);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null }, () => {
            if (typeof window !== 'undefined') {
                window.location.reload();
            }
        });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                        !
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        The app hit an unexpected error. Please reload to continue.
                    </p>
                    <button
                        onClick={this.handleReload}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600"
                    >
                        Reload app
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
