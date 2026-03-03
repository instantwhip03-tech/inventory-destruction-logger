import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, QrCode, Trash2, Clock, CheckCircle, Loader2 } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState("scanner");
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
      const fetchPromise = fetch(GOOGLE_APPS_SCRIPT_URL + "?action=getInventory");
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
          <p className="text-slate-600">Scan QR codes and log inventory dumps to Google Sheets with automatic timestamps</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="scanner">QR Scanner</TabsTrigger>
            <TabsTrigger value="log" disabled={!selectedInventory}>
              Log Dump
            </TabsTrigger>
            <TabsTrigger value="history">Dump History</TabsTrigger>
          </TabsList>

          {/* QR Scanner Tab */}
          <TabsContent value="scanner" className="space-y-6">
            <Card className="border-red-200 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-red-600" />
                  Scan QR Code
                </CardTitle>
                <CardDescription>Point your device camera at the QR code on the inventory item</CardDescription>
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

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-slate-500">Or manually enter Product ID (Demo):</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., INV-001"
                    value={scannedQRCode}
                    onChange={(e) => setScannedQRCode(e.target.value)}
                    className="border-red-200"
                  />
                  <Button
                    onClick={() => simulateQRScan(scannedQRCode)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Scan
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Available Inventory Items */}
            <Card className="border-red-200 shadow-md">
              <CardHeader>
                <CardTitle>Available Inventory Items</CardTitle>
                <CardDescription>
                  {isLoadingInventory ? "Loading from Google Sheet..." : `${inventoryItems.length} items available`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingInventory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-red-600 mr-2" />
                    <span>Loading inventory...</span>
                  </div>
                ) : inventoryItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
                    <p className="text-slate-600">No inventory items found. Please contact your administrator.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {inventoryItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => simulateQRScan(item.id)}
                        className="p-3 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="text-sm text-slate-600">ID: {item.id}</p>
                          </div>
                          <Badge variant="outline" className="ml-2">
                            {item.unit}
                          </Badge>
                        </div>
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
              <Card className="border-red-200 shadow-md bg-red-50/50">
                <CardHeader>
                  <CardTitle className="text-red-900">Log Destruction</CardTitle>
                  <CardDescription>
                    Selected: <span className="font-semibold">{selectedInventory.name}</span>
                  </CardDescription>
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
                      className="border-red-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Unit: {selectedInventory.unit}
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Employee Name
                    </label>
                    <Input
                      placeholder="Enter your name"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      className="border-red-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Reason for Destruction
                    </label>
                    <select
                      value={reasonInput}
                      onChange={(e) => setReasonInput(e.target.value)}
                      className="w-full px-3 py-2 border border-red-200 rounded-md"
                    >
                      <option value="DAMAGED">Damaged</option>
                      <option value="EXPIRED">Expired</option>
                      <option value="RECALL">Recall</option>
                      <option value="WASTE">Waste</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <Button
                    onClick={handleSubmitDestruction}
                    disabled={isSubmitting}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Submit to Google Sheet
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
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
                  {destructionLogs.length} destruction entries logged
                </CardDescription>
              </CardHeader>
              <CardContent>
                {destructionLogs.length === 0 ? (
                  <p className="text-slate-600 text-center py-8">No destruction logs yet</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {destructionLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 border border-red-200 rounded-lg bg-red-50/50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-slate-900">{log.inventoryName}</p>
                            <p className="text-sm text-slate-600">{log.timestamp}</p>
                          </div>
                          <Badge
                            variant={log.googleSheetStatus === "success" ? "default" : "destructive"}
                          >
                            {log.googleSheetStatus === "success" ? "✓ Saved" : "✗ Error"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                          <div>Quantity: {log.quantity} {log.unit}</div>
                          <div>Employee: {log.employeeName}</div>
                          <div>Reason: {log.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Destruction logged successfully!
        </div>
      )}

      {/* Error Toast */}
      {showError && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
