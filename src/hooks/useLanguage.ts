import { useLanguage as useLangFromContext } from '../context/LanguageContext';

// Re-export the context hook implemented in LanguageContext
export const useLanguage = useLangFromContext;
export default useLanguage;
