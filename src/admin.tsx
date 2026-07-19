import { createRoot } from 'react-dom/client';
import './styles/index.scss';
import AdminApp from './AdminApp';
import { registerLoyaltyBayRegistry } from './registry';

registerLoyaltyBayRegistry();

const rootElement = document.getElementById( 'loyaltybay' );
if ( rootElement ) {
	createRoot( rootElement ).render( <AdminApp /> );
}
