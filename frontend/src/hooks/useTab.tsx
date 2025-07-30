import { usePersistentState } from "../utils/usePersistentState";
import { useState, useEffect } from "react";

export function useTab(quotaExceeded: boolean) {
    const [pendingTab, setPendingTab] = useState<string | null>(null);
    const [activeTab, setActiveTab] = usePersistentState<string>('activeTab', "1");
    const [displayedTab, setDisplayedTab] = usePersistentState<string>('displayedTab', "1"); // controls which tab's content is shown
    const [tabFade, setTabFade] = useState(true);
    
    useEffect(() => {
        setTabFade(false);
        const timeout = setTimeout(() => setTabFade(true), 150); // match duration-500 for smooth fade
        return () => clearTimeout(timeout);

    }, [activeTab, quotaExceeded])


    // tab change handler
    const handleTabChange = (tabId: string) => {
        if (tabId === activeTab) return; 
        setPendingTab(tabId);
        setTabFade(false);
    }

    useEffect(() => {
        if (!tabFade && pendingTab && pendingTab !== activeTab) {
        // Wait for fade-out to finish (match duration-200)
        const timeout = setTimeout(() => {
            setActiveTab(pendingTab); // update activeTab for button highlight
            setDisplayedTab(pendingTab); // switch content only after fade-out
            setTabFade(true); // fade in new content
            setPendingTab(null);
        }, 150); // match duration-200
        return () => clearTimeout(timeout);
    }
    }, [tabFade, pendingTab, activeTab, setActiveTab, setDisplayedTab])

    return { activeTab, setActiveTab, displayedTab, setDisplayedTab, tabFade, setTabFade, handleTabChange }
}