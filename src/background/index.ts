import { mergeAndSaveItem, getItem, deleteItem } from '@/shared/db';
import type { ContentItem } from '@/shared/types';

// 全局日志缓存
let globalLogs: any[] = [];
const MAX_LOGS = 100;

chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (message.type === 'SAVE_ITEM') {
    const item = message.payload as ContentItem;
    // Async handling
    (async () => {
      try {
        await mergeAndSaveItem(item);
        console.log('Item saved:', item.title);
        sendResponse({ success: true });
      } catch (e) {
        console.error('Save failed', e);
        sendResponse({ success: false, error: e });
      }
    })();
    return true; // Keep channel open
  }

  if (message.type === 'CHECK_EXISTENCE') {
    const { id } = message.payload;
    (async () => {
      try {
        const item = await getItem(id);
        sendResponse({ exists: !!item });
      } catch (e) {
        sendResponse({ exists: false });
      }
    })();
    return true;
  }

  if (message.type === 'DELETE_ITEM') {
    const { id } = message.payload;
    (async () => {
      try {
        await deleteItem(id);
        console.log('Item deleted:', id);
        sendResponse({ success: true });
      } catch (e) {
        console.error('Delete failed', e);
        sendResponse({ success: false, error: e });
      }
    })();
    return true;
  }

  if (message.type === 'ADD_LOG') {
    const entry = message.payload;
    globalLogs = [entry, ...globalLogs].slice(0, MAX_LOGS);
    
    // 广播给所有标签页
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'SYNC_LOGS', payload: globalLogs }).catch(() => {
            // 忽略不可达的标签页
          });
        }
      });
    });
    return false;
  }

  if (message.type === 'GET_LOGS') {
    sendResponse(globalLogs);
    return false;
  }

  if (message.type === 'CLEAR_LOGS') {
    globalLogs = [];
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'SYNC_LOGS', payload: globalLogs }).catch(() => {});
        }
      });
    });
    return false;
  }

  if (message.type === 'OPEN_SIDE_PANEL') {
    // Open side panel
    if (chrome.sidePanel && chrome.sidePanel.open) {
       if (sender.tab?.id) {
         chrome.sidePanel.open({ tabId: sender.tab.id });
       } else {
         chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.sidePanel.open({ tabId: tabs[0].id });
            }
         });
       }
    }
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('哈基米冲浪助手 (Surfing Hachimi) installed');
  // Set side panel behavior
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error: any) => console.error(error));
  }
});
