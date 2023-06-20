import React, { useEffect } from 'react'
import { fbApp } from './fb'
import TestPage from './pages/test'
import {
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom'
import ErrorPage from './pages/error'
import RootPage from './pages/root'
import IframePage from './pages/iframe'

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: 'test',
    element: <TestPage />,
  },
  {
    path: 'iframe',
    element: <IframePage />,
  },
  {
    path: 'test/bb',
    element: <div>hey</div>,
  },
])

export default () => {
  return <RouterProvider router={router} />
}
