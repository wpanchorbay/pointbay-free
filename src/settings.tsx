import { createRoot } from 'react-dom/client';
import './styles/index.scss';
import SettingsApp from './SettingsApp';
import { registerPointBayRegistry } from './registry';

registerPointBayRegistry();

const rootElement = document.getElementById( 'pointbay' );
if ( rootElement ) {
	createRoot( rootElement ).render( <SettingsApp /> );
}
