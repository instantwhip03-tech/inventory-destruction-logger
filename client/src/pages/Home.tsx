import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, QrCode, Trash2, Clock, CheckCircle, Loader2, Search } from "lucide-react";

// Google Apps Script deployment URL
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzJQgz9cSiEszPrys-EyMX8offgJDk18tDNeorwjbDGhdViirn8jo_sXJnztwED6eaT/exec";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  category: string;
}

interface DestructionLog {
  id: string;
  inventoryId: string;
  inventoryName: string;
  quantity: number;
  unit: string;
  timestamp: string;
  employeeName: string;
  reason: string;
  googleSheetStatus: "pending" | "success" | "error";
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("browse");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [scannedQRCode, setScannedQRCode] = useState("");
  const [selectedInventory, setSelectedInventory] = useState<InventoryItem | null>(null);
  const [quantityInput, setQuantityInput] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [reasonInput, setReasonInput] = useState("DAMAGED");
  const [destructionLogs, setDestructionLogs] = useState<DestructionLog[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Fallback test data
  const testData: InventoryItem[] = [
    { id: "INV-001", name: "Vanilla Ice Cream", unit: "Liter", category: "United" },
    { id: "INV-002", name: "Chocolate Ice Cream", unit: "Liter", category: "Maola" },
    { id: "INV-003", name: "Strawberry Ice Cream", unit: "Liter", category: "Other" },
    { id: "INV-004", name: "Mint Chip Ice Cream", unit: "Liter", category: "United" },
    { id: "INV-005", name: "Cookie Dough Ice Cream", unit: "Liter", category: "Maola" }
  ];

  // Fetch inventory items from Google Sheet on component mount and set up auto-refresh
  useEffect(() => {
    fetchInventoryItems();
    
    // Auto-refresh inventory every 5 minutes (300,000 milliseconds)
    const refreshInterval = setInterval(() => {
      fetchInventoryItems();
    }, 5 * 60 * 1000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);

  const fetchInventoryItems = async () => {
    try {
      setIsLoadingInventory(true);
      
      // Create a timeout promise that rejects after 5 seconds
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('API timeout')), 5000)
      );
      
      // Race between the fetch and timeout
      const fetchPromise = fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getInventory' })
      });
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch inventory: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("API Response:", data);
      
      if (data.status === "success" && data.items && data.items.length > 0) {
        // Convert the items from the API response
        const items: InventoryItem[] = data.items.map((item: any) => ({
          id: String(item.productId || item.id || ""),
          name: String(item.description || item.name || ""),
          unit: String(item.uom || item.unit || ""),
          category: String(item.category || "")
        }));
        setInventoryItems(items);
        console.log("Loaded " + items.length + " inventory items from API");
      } else {
        throw new Error(data.message || "No inventory items found in Google Sheet.");
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
      // Use fallback test data
      setInventoryItems(testData);
      console.log("Using fallback test data - API may be unavailable");
    } finally {
      setIsLoadingInventory(false);
    }
  };

  // Get unique categories from inventory items
  const getCategories = () => {
    const categories = new Set(inventoryItems.map(item => item.category).filter(Boolean));
    return Array.from(categories).sort();
  };

  // Filter inventory items by category and search query
  const getFilteredItems = () => {
    let filtered = inventoryItems;
    
    if (activeCategory !== "all") {
      filtered = filtered.filter(item => item.category === activeCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  // Initialize camera for QR code scanning
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setCameraActive(false);
    }
  };

  // Simulate QR code scanning
  const simulateQRScan = (qrCode: string) => {
    const inventory = inventoryItems.find((item) => item.id === qrCode);
    if (inventory) {
      setSelectedInventory(inventory);
      setScannedQRCode(qrCode);
      setQuantityInput("");
      setActiveTab("log");
    } else {
      setErrorMessage("Invalid QR code. Inventory item not found.");
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  // Select item from browse list
  const handleSelectItem = (item: InventoryItem) => {
    setSelectedInventory(item);
    setScannedQRCode(item.id);
    setQuantityInput("");
    setActiveTab("log");
  };

  // Submit destruction log to Google Sheet
  const handleSubmitDestruction = async () => {
    if (!selectedInventory || !quantityInput || !employeeName) {
      setErrorMessage("Please fill in all fields");
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for Google Apps Script
      const logData = {
        action: "logDestruction",
        productId: selectedInventory.id,
        productName: selectedInventory.name,
        quantity: parseFloat(quantityInput),
        unit: selectedInventory.unit,
        category: selectedInventory.category,
        employeeName: employeeName,
        reason: reasonInput,
        timestamp: new Date().toISOString()
      };

      // Send to Google Apps Script
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(logData),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      console.log("Submission result:", result);

      // Create local log entry
      const timestamp = new Date().toLocaleString();
      const newLog: DestructionLog = {
        id: `LOG-${Date.now()}`,
        inventoryId: selectedInventory.id,
        inventoryName: selectedInventory.name,
        quantity: parseFloat(quantityInput),
        unit: selectedInventory.unit,
        timestamp,
        employeeName,
        reason: reasonInput,
        googleSheetStatus: result.status === "success" ? "success" : "error",
      };

      setDestructionLogs([...destructionLogs, newLog]);
      setShowSuccess(true);
      setSelectedInventory(null);
      setQuantityInput("");
      setScannedQRCode("");
      setReasonInput("DAMAGED");

      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error submitting to Google Sheet:", error);
      setErrorMessage("Error saving to Google Sheet. Please try again.");
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = getCategories();
  const filteredItems = getFilteredItems();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-red-100">
      {/* Header */}
      <header className="border-b border-red-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
              <Trash2 className="text-white w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Inventory Dump Log</h1>
          </div>
          <p className="text-slate-600">Scan QR codes or browse items and log inventory dumps to Google Sheets</p>
        </div>
      </header>

      {/* Success/Error Messages */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-40">
          <CheckCircle className="w-5 h-5" />
          Destruction logged successfully!
        </div>
      )}

      {showError && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-40">
          <AlertCircle className="w-5 h-5" />
          {errorMessage}
        </div>
      )}

      {/* Main Content */}
      <main className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="browse">Browse Items</TabsTrigger>
            <TabsTrigger value="log" disabled={!selectedInventory}>
              Log Dump
            </TabsTrigger>
            <TabsTrigger value="history">Dump History</TabsTrigger>
          </TabsList>

          {/* Browse Items Tab */}
          <TabsContent value="browse" className="space-y-6">
            {/* Search Bar */}
            <Card className="border-red-200 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-red-600" />
                  Search Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Search by product name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Category Tabs */}
            {categories.length > 0 && (
              <Card className="border-red-200 shadow-md">
                <CardHeader>
                  <CardTitle>Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                    <button
                      onClick={() => setActiveCategory("all")}
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg font-bold text-xs sm:text-sm transition-all p-1 ${
                        activeCategory === "all"
                          ? "bg-red-600 text-white shadow-md"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <span className="text-base sm:text-lg">All</span>
                      <span className="text-[10px] sm:text-xs mt-0.5">({inventoryItems.length})</span>
                    </button>
                    {categories.map((category) => {
                      const count = inventoryItems.filter(item => item.category === category).length;
                      return (
                        <button
                          key={category}
                          onClick={() => setActiveCategory(category)}
                          className={`aspect-square flex flex-col items-center justify-center rounded-lg font-bold text-xs sm:text-sm transition-all p-1 ${
                            activeCategory === category
                              ? "bg-red-600 text-white shadow-md"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          <span className="text-base sm:text-lg line-clamp-1">{category}</span>
                          <span className="text-[10px] sm:text-xs mt-0.5">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Inventory Items List */}
            <Card className="border-red-200 shadow-md">
              <CardHeader>
                <CardTitle>
                  {activeCategory === "all" ? "All Items" : `${activeCategory} Items`}
                </CardTitle>
                <CardDescription>
                  {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingInventory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
                    <span className="ml-2 text-slate-600">Loading inventory...</span>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No items found. Try adjusting your search or category.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                        onClick={() => handleSelectItem(item)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="text-sm text-slate-600">ID: {item.id}</p>
                          </div>
                          <Badge className="bg-red-100 text-red-800">{item.category}</Badge>
                        </div>
                        <p className="text-sm text-slate-500">Unit: {item.unit}</p>
                        <Button
                          size="sm"
                          className="mt-3 w-full bg-red-600 hover:bg-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectItem(item);
                          }}
                        >
                          Select Item
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Log Dump Tab */}
          <TabsContent value="log" className="space-y-6">
            {selectedInventory && (
              <>
                <Card className="border-red-200 shadow-md bg-red-50">
                  <CardHeader>
                    <CardTitle>Selected Item</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Product ID:</strong> {selectedInventory.id}</p>
                      <p><strong>Name:</strong> {selectedInventory.name}</p>
                      <p><strong>Unit:</strong> {selectedInventory.unit}</p>
                      <p><strong>Category:</strong> <Badge>{selectedInventory.category}</Badge></p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-red-200 shadow-md">
                  <CardHeader>
                    <CardTitle>Log Destruction</CardTitle>
                    <CardDescription>Enter the details of the inventory destruction</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Quantity to Destroy
                      </label>
                      <Input
                        type="number"
                        placeholder="Enter quantity"
                        value={quantityInput}
                        onChange={(e) => setQuantityInput(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Employee Name
                      </label>
                      <Input
                        type="text"
                        placeholder="Enter your name"
                        value={employeeName}
                        onChange={(e) => setEmployeeName(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Reason for Destruction
                      </label>
                      <select
                        value={reasonInput}
                        onChange={(e) => setReasonInput(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      >
                        <option>DAMAGED</option>
                        <option>EXPIRED</option>
                        <option>RECALL</option>
                        <option>QUALITY_ISSUE</option>
                        <option>OTHER</option>
                      </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={handleSubmitDestruction}
                        disabled={isSubmitting}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Submit to Google Sheet"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedInventory(null);
                          setQuantityInput("");
                          setScannedQRCode("");
                          setActiveTab("browse");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Dump History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="border-red-200 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-red-600" />
                  Destruction History
                </CardTitle>
                <CardDescription>
                  {destructionLogs.length} destruction{destructionLogs.length !== 1 ? "s" : ""} logged
                </CardDescription>
              </CardHeader>
              <CardContent>
                {destructionLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No destructions logged yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {destructionLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 border border-red-200 rounded-lg"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-slate-900">{log.inventoryName}</p>
                            <p className="text-sm text-slate-600">ID: {log.inventoryId}</p>
                          </div>
                          <Badge
                            className={
                              log.googleSheetStatus === "success"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {log.googleSheetStatus === "success" ? "Saved" : "Error"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-2">
                          <p><strong>Quantity:</strong> {log.quantity} {log.unit}</p>
                          <p><strong>Employee:</strong> {log.employeeName}</p>
                          <p><strong>Reason:</strong> {log.reason}</p>
                          <p><strong>Time:</strong> {log.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* QR Scanner Section - Moved to Bottom */}
        <div className="mt-12">
          <Card className="border-red-200 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-red-600" />
                QR Code Scanner
              </CardTitle>
              <CardDescription>Alternatively, scan a QR code to quickly select an item</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!cameraActive ? (
                <Button onClick={startCamera} className="w-full bg-red-600 hover:bg-red-700">
                  Start Camera
                </Button>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg border-2 border-red-300"
                  />
                  <Button onClick={stopCamera} variant="outline" className="w-full">
                    Stop Camera
                  </Button>
                </>
              )}

              <div className="border-t border-red-200 pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Or manually enter Product ID:
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter Product ID"
                    value={scannedQRCode}
                    onChange={(e) => setScannedQRCode(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => simulateQRScan(scannedQRCode)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Search
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
