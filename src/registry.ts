import {
	ClassicButton,
	ClassicInput,
	ClassicSelect,
	ClassicMultiSelect,
	ClassicCheckbox,
	ClassicTable,
	ClassicSettingsTable,
	ClassicTextarea,
	ClassicRepeater,
} from './components/classics';
import CustomModal from './components/common/CustomModal';
import { useToast } from './store/toast/use-toast';

/**
 * Shared components exposed on `window.pointbay` so any other plugin can
 * reuse them instead of bundling their own copies. Read at component-render
 * time, so assignment order relative to a consuming script only matters for
 * the WordPress hooks addFilter/applyFilters calls, not this object.
 */
export function registerPointBayRegistry() {
	( window as any ).pointbay = {
		components: {
			ClassicButton,
			ClassicInput,
			ClassicSelect,
			ClassicMultiSelect,
			ClassicCheckbox,
			ClassicTable,
			ClassicSettingsTable,
			ClassicTextarea,
			ClassicRepeater,
			CustomModal,
		},
		useToast,
	};
}
