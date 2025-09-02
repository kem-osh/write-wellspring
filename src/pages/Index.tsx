import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DocumentLibrary } from '@/components/DocumentLibrary';
import Auth from './Auth';

export function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return user ? <DocumentLibrary /> : <Auth />;
}
