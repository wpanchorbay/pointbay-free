import {
	ClassicButton,
	ClassicInput,
	ClassicSelect,
	ClassicMultiSelect,
	ClassicCheckbox,
	ClassicTable,
	ClassicSettingsTable,
	ClassicTextarea,
} from './components/classics';
import CustomModal from './components/common/CustomModal';
import { useToast } from './store/toast/use-toast';

/**
 * Shared components exposed for add-on plugins (e.g. loyaltybaypro) to reuse
 * instead of bundling their own copies. Read by pro at component-render
 * time, so assignment order relative to pro's script only matters for the
 * WordPress hooks addFilter/applyFilters calls, not this object.
 */
export function registerLoyaltyBayRegistry() {
	( window as any ).loyaltybay = {
		components: {
			ClassicButton,
			ClassicInput,
			ClassicSelect,
			ClassicMultiSelect,
			ClassicCheckbox,
			ClassicTable,
			ClassicSettingsTable,
			ClassicTextarea,
			CustomModal,
		},
		useToast,
	};
}
