/**
 * AgentSidebar — Real specialist-agent chat panel.
 * Thin re-export of the host's AgentChatSidebar (window.__quoxGlass), the
 * same live chat surface every Quox agent uses. No mock chat, no stubbed
 * reply, no position:fixed overlay, no hard-coded hex background.
 */

const { AgentChatSidebar } = window.__quoxGlass;

export default AgentChatSidebar;
