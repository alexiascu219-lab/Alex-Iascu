
import React, { useState, useEffect } from 'react';
import { Plus, Search, MapPin, MessageSquare, Camera, X, Loader2, Trash2, ArrowLeft } from 'lucide-react';
import { InventoryItem, ChatMessage } from './types';
import { analyzeItemImage, chatWithInventory } from './geminiService';

const Logo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg className={`${className} logo-animate`}>
    <use href="#won-it-logo" />
  </svg>
);

const App: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('won-it-inventory');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: '',
    location: '',
    category: '',
    description: '',
    imageUrl: ''
  });

  useEffect(() => {
    localStorage.setItem('won-it-inventory', JSON.stringify(items));
  }, [items]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setNewItem(prev => ({ ...prev, imageUrl: base64 }));
      
      setIsAnalyzing(true);
      try {
        const analysis = await analyzeItemImage(base64);
        setNewItem(prev => ({
          ...prev,
          name: analysis.name,
          category: analysis.category,
          description: analysis.description
        }));
      } catch (error) {
        console.error("Analysis failed", error);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveItem = () => {
    if (!newItem.name || !newItem.location) return;
    const item: InventoryItem = {
      id: crypto.randomUUID(),
      name: newItem.name || 'Unnamed Item',
      location: newItem.location || 'Unknown',
      category: newItem.category || 'General',
      description: newItem.description || '',
      imageUrl: newItem.imageUrl || 'https://picsum.photos/400/300',
      dateAdded: new Date().toISOString()
    };
    setItems([item, ...items]);
    setIsAdding(false);
    setNewItem({ name: '', location: '', category: '', description: '', imageUrl: '' });
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("Remove this item from your inventory?")) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const reply = await chatWithInventory(chatInput, items, chatHistory);
      setChatHistory(prev => [...prev, { role: 'model', text: reply || "I'm not sure about that." }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Sorry, I had trouble connecting to the brain." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col safe-top">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 sm:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Logo className="w-9 h-9" />
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Won-It <span className="text-indigo-600">Org</span></h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowChat(true)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
            aria-label="Open AI Assistant"
          >
            <MessageSquare className="w-6 h-6" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white"></span>
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-2 sm:px-4 sm:py-2 rounded-lg font-medium transition-all shadow-md active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Item</span>
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors w-5 h-5" />
          <input 
            type="text" 
            placeholder="Find items..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-700"
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-8 pb-20 max-w-7xl mx-auto w-full">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-slate-100 p-6 rounded-full mb-4">
              <Logo className="w-16 h-16 opacity-30 grayscale" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">No items found</h3>
            <p className="text-slate-500 mt-1 text-sm">Start storing your wins!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm flex flex-col group hover:shadow-md transition-shadow">
                <div className="aspect-square relative overflow-hidden bg-slate-100">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-md text-red-500 rounded-full shadow-sm hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute bottom-2 left-2">
                    <span className="px-2 py-0.5 bg-indigo-600/90 text-white text-[10px] font-bold rounded-md">
                      {item.category}
                    </span>
                  </div>
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="text-sm font-bold text-slate-900 mb-0.5 line-clamp-1">{item.name}</h3>
                  <div className="flex items-center gap-1 text-slate-500">
                    <MapPin className="w-3 h-3 text-indigo-500" />
                    <span className="text-[11px] font-medium">{item.location}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-bottom duration-300">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <button onClick={() => setIsAdding(false)} className="p-2 -ml-2">
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
               <Logo className="w-6 h-6" />
               <h2 className="text-lg font-bold text-slate-900">New Treasure</h2>
            </div>
            <div className="w-10"></div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
            <div className="space-y-2">
              {!newItem.imageUrl ? (
                <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer bg-slate-50 hover:bg-indigo-50/30 transition-colors">
                  <Camera className="w-10 h-10 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">Take photo or upload</p>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                </label>
              ) : (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200">
                  <img src={newItem.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setNewItem(prev => ({ ...prev, imageUrl: '', name: '', category: '', description: '' }))}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-indigo-900/40 flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <span className="text-sm font-bold">Identifying...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Item Name</label>
                <input 
                  type="text" 
                  placeholder="What is it?" 
                  value={newItem.name}
                  onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Location</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Shed" 
                    value={newItem.location}
                    onChange={e => setNewItem(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Category</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Tools" 
                    value={newItem.category}
                    onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Description</label>
                <textarea 
                  rows={3}
                  placeholder="Notes..." 
                  value={newItem.description}
                  onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm resize-none"
                />
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 safe-bottom">
            <button 
              onClick={handleSaveItem}
              disabled={!newItem.name || !newItem.location}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              Confirm Storage
            </button>
          </div>
        </div>
      )}

      {/* Chat Bot Drawer */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-right duration-300">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white safe-top">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowChat(false)} className="p-1 -ml-1">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h2 className="font-bold text-base leading-tight">Storage Assistant</h2>
                <span className="text-[10px] text-indigo-100 uppercase font-bold tracking-widest">Powered by Gemini</span>
              </div>
            </div>
            <Logo className="w-6 h-6 opacity-80" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50">
            {chatHistory.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-slate-100">
                   <Logo className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-slate-600 font-bold">How can I help?</p>
                  <p className="text-slate-400 text-xs mt-1">"Where is my red toolkit?"</p>
                </div>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-md' 
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-slate-200 flex gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-100 safe-bottom">
            <div className="relative flex items-center">
              <input 
                type="text" 
                placeholder="Message assistant..." 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isChatLoading}
                className="absolute right-2 p-1.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
