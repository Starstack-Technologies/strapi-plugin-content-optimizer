import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { HomePage } from '../HomePage/index.jsx';

export const App = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
    </Routes>
  );
};
