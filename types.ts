
export interface InventoryItem {
  id: string;
  name: string;
  location: string;
  description: string;
  category: string;
  imageUrl: string;
  dateAdded: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AnalysisResult {
  name: string;
  category: string;
  description: string;
}
