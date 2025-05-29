import React from 'react';
import { ToastContainer as ReactToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Provide default props for position and disable autoClose
export const ToastContainer: React.FC = (props) => (
  <ReactToastContainer position="top-right" autoClose={false} closeOnClick={true} {...props} />
);
