import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, X, Sparkles, DollarSign, Package, Zap } from "lucide-react";

type ProductType = "digital" | "physical" | "service";

interface ProductFormData {
  // Step 1
  type: ProductType;
  
  // Step 2
  title: string;
  category: string;
  priceAmount: number;
  shortDescription: string;
  description: string;
  
  // Step 3A - Digital
  digitalFiles: Array<{url: string, name: string, size: number}>;
  downloadLimit: number | null;
  accessDuration: number | null;
  
  // Step 3B - Physical
  shippingType: "self" | "fulfillment";
  shippingCost: number;
  estimatedDeliveryDays: number;
  inventory: number | null;
  variations: {sizes?: string[], colors?: string[]};
  
  // Step 3C - Service
  serviceDuration: number;
  deliveryMethods: string[];
  bookingEnabled: boolean;
  turnaroundDays: number;
  
  // Step 4
  mainImage: string;
  additionalImages: string[];
  productVideo: string;
  
  // Step 5
  regularPrice: number;
  salePrice: number;
  saleEndDate: Date | null;
  monthlyPrice: number;
  
  // Step 6
  keywords: string[];
  targetAudience: string[];
  contentRating: "general" | "18+" | "21+";
  
  // Step 7
  refundPolicy: "no-refunds" | "7-day" | "30-day" | "custom";
  customRefundPolicy: string;
  customerInstructions: string;
  termsOfUse: string;
  
  // Step 8
  publishOption: "immediate" | "scheduled" | "draft";
  scheduledFor: Date | null;
  notifySubscribers: boolean;
  shareOnSocial: boolean;
}

const CATEGORIES = [
  "Courses & Education",
  "Ebooks & Guides",
  "Presets & Templates",
  "Audio & Music",
  "Software & Apps",
  "Digital Art",
  "Merchandise",
  "Beauty & Skincare",
  "Fitness Gear",
  "Handmade Goods",
  "Coaching & Consulting",
  "Content Creation",
  "Shoutouts & Promotions",
  "Meet & Greets",
  "Other"
];

export default function MarketplaceCreate() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<ProductFormData>>({
    type: "digital",
    priceAmount: 0,
    downloadLimit: null,
    accessDuration: null,
    shippingType: "self",
    shippingCost: 0,
    estimatedDeliveryDays: 7,
    inventory: null,
    variations: {},
    serviceDuration: 60,
    deliveryMethods: [],
    bookingEnabled: false,
    turnaroundDays: 3,
    additionalImages: [],
    regularPrice: 0,
    salePrice: 0,
    saleEndDate: null,
    monthlyPrice: 0,
    keywords: [],
    targetAudience: [],
    contentRating: "general",
    refundPolicy: "no-refunds",
    customRefundPolicy: "",
    customerInstructions: "",
    termsOfUse: "",
    publishOption: "immediate",
    scheduledFor: null,
    notifySubscribers: false,
    shareOnSocial: false,
  });

  const createProduct = trpc.marketplace.createProduct.useMutation({
    onSuccess: () => {
      toast.success("Product created successfully!");
      navigate("/marketplace/manage");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create product");
    },
  });

  const nextStep = () => {
    // Validation for current step
    if (currentStep === 2) {
      if (!formData.title || !formData.category || !formData.priceAmount) {
        toast.error("Please fill in all required fields");
        return;
      }
    }
    
    if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    createProduct.mutate(formData as ProductFormData);
  };

  const updateFormData = (updates: Partial<ProductFormData>) => {
    setFormData({ ...formData, ...updates });
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white">
      <div className="container max-w-4xl py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#00AEEF] to-[#7B2CBF] bg-clip-text text-transparent">
            Create New Product
          </h1>
          <p className="text-gray-400">
            Step {currentStep} of 8 - {getStepTitle(currentStep, formData.type || "digital")}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
              <div
                key={step}
                className={`w-full h-2 mx-1 rounded-full ${
                  step <= currentStep
                    ? "bg-gradient-to-r from-[#00AEEF] to-[#7B2CBF]"
                    : "bg-gray-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="bg-[#1A1A1A] border-gray-800">
          <CardContent className="p-8">
            {currentStep === 1 && <Step1ProductType formData={formData} updateFormData={updateFormData} />}
            {currentStep === 2 && <Step2BasicInfo formData={formData} updateFormData={updateFormData} />}
            {currentStep === 3 && formData.type === "digital" && <Step3ADigital formData={formData} updateFormData={updateFormData} />}
            {currentStep === 3 && formData.type === "physical" && <Step3BPhysical formData={formData} updateFormData={updateFormData} />}
            {currentStep === 3 && formData.type === "service" && <Step3CService formData={formData} updateFormData={updateFormData} />}
            {currentStep === 4 && <Step4Media formData={formData} updateFormData={updateFormData} />}
            {currentStep === 5 && <Step5Pricing formData={formData} updateFormData={updateFormData} />}
            {currentStep === 6 && <Step6SEO formData={formData} updateFormData={updateFormData} />}
            {currentStep === 7 && <Step7Terms formData={formData} updateFormData={updateFormData} />}
            {currentStep === 8 && <Step8Preview formData={formData} updateFormData={updateFormData} />}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="bg-transparent border-gray-700 text-white hover:bg-gray-800"
          >
            Previous
          </Button>
          
          {currentStep < 8 ? (
            <Button
              onClick={nextStep}
              className="bg-gradient-to-r from-[#00AEEF] to-[#7B2CBF] hover:opacity-90"
            >
              Continue
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => updateFormData({ publishOption: "draft" })}
                className="bg-transparent border-gray-700 text-white hover:bg-gray-800"
              >
                Save Draft
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createProduct.isPending}
                className="bg-gradient-to-r from-[#00AEEF] to-[#7B2CBF] hover:opacity-90"
              >
                {createProduct.isPending ? "Publishing..." : "Publish Product"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// STEP 1: Product Type Selection
function Step1ProductType({ formData, updateFormData }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">What type of product are you selling?</h2>
        <RadioGroup
          value={formData.type}
          onValueChange={(value) => updateFormData({ type: value as ProductType })}
          className="space-y-4"
        >
          <div className="flex items-center space-x-3 p-4 border border-gray-700 rounded-lg hover:border-[#00AEEF] cursor-pointer">
            <RadioGroupItem value="digital" id="digital" />
            <Label htmlFor="digital" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-[#00AEEF]" />
                <div>
                  <div className="font-semibold">Digital Product</div>
                  <div className="text-sm text-gray-400">Courses, ebooks, presets, templates, audio, software, digital art</div>
                </div>
              </div>
            </Label>
          </div>
          
          <div className="flex items-center space-x-3 p-4 border border-gray-700 rounded-lg hover:border-[#00AEEF] cursor-pointer">
            <RadioGroupItem value="physical" id="physical" />
            <Label htmlFor="physical" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-[#7B2CBF]" />
                <div>
                  <div className="font-semibold">Physical Product</div>
                  <div className="text-sm text-gray-400">Merchandise, print-on-demand, beauty, fitness gear, handmade goods</div>
                </div>
              </div>
            </Label>
          </div>
          
          <div className="flex items-center space-x-3 p-4 border border-gray-700 rounded-lg hover:border-[#00AEEF] cursor-pointer">
            <RadioGroupItem value="service" id="service" />
            <Label htmlFor="service" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-[#00AEEF]" />
                <div>
                  <div className="font-semibold">Service</div>
                  <div className="text-sm text-gray-400">Coaching, content creation, shoutouts, consulting, meet & greets</div>
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}

// STEP 2: Basic Information
function Step2BasicInfo({ formData, updateFormData }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Basic Information</h2>
      </div>
      
      <div>
        <Label htmlFor="title">Product Title *</Label>
        <Input
          id="title"
          value={formData.title || ""}
          onChange={(e) => updateFormData({ title: e.target.value })}
          placeholder="e.g., Ultimate Fitness Program"
          className="bg-[#1A1A1A] border-gray-700 text-white"
        />
      </div>
      
      <div>
        <Label htmlFor="category">Category *</Label>
        <Select value={formData.category || ""} onValueChange={(value) => updateFormData({ category: value })}>
          <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent className="bg-[#1A1A1A] border-gray-700 text-white">
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="price">Price (USD) *</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            id="price"
            type="number"
            value={formData.priceAmount ? formData.priceAmount / 100 : ""}
            onChange={(e) => updateFormData({ priceAmount: Math.round(parseFloat(e.target.value || "0") * 100) })}
            placeholder="29.99"
            className="bg-[#1A1A1A] border-gray-700 text-white pl-10"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="shortDesc">Short Description * (280 characters)</Label>
        <Textarea
          id="shortDesc"
          value={formData.shortDescription || ""}
          onChange={(e) => updateFormData({ shortDescription: e.target.value.slice(0, 280) })}
          placeholder="A brief description that appears in search results"
          maxLength={280}
          className="bg-[#1A1A1A] border-gray-700 text-white"
          rows={3}
        />
        <div className="text-sm text-gray-400 mt-1">{formData.shortDescription?.length || 0}/280</div>
      </div>
      
      <div>
        <Label htmlFor="description">Full Description *</Label>
        <Textarea
          id="description"
          value={formData.description || ""}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder="Detailed description with features, benefits, what's included..."
          className="bg-[#1A1A1A] border-gray-700 text-white"
          rows={8}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 bg-transparent border-[#00AEEF] text-[#00AEEF] hover:bg-[#00AEEF] hover:text-white"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate with AI
        </Button>
      </div>
    </div>
  );
}

// STEP 3A: Digital Product Fields
function Step3ADigital({ formData, updateFormData }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Digital Product Details</h2>
      </div>
      
      <div>
        <Label>Upload Files</Label>
        <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-[#00AEEF] cursor-pointer">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400 mb-2">Drag & drop files here or click to browse</p>
          <p className="text-sm text-gray-500">
            Supported: Video (MP4/MOV/AVI max 5GB), Docs (PDF/DOCX/EPUB), Images (JPG/PNG/PSD/AI), Audio (MP3/WAV/M4A), Archives (ZIP/RAR)
          </p>
        </div>
      </div>
      
      <div>
        <Label>Download Limit</Label>
        <RadioGroup value={formData.downloadLimit === null ? "unlimited" : "limited"} onValueChange={(value) => updateFormData({ downloadLimit: value === "unlimited" ? null : 5 })}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="unlimited" id="unlimited-downloads" />
            <Label htmlFor="unlimited-downloads">Unlimited downloads</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="limited" id="limited-downloads" />
            <Label htmlFor="limited-downloads">Limited to</Label>
            {formData.downloadLimit !== null && (
              <Input
                type="number"
                value={formData.downloadLimit || 5}
                onChange={(e) => updateFormData({ downloadLimit: parseInt(e.target.value) })}
                className="w-20 bg-[#1A1A1A] border-gray-700 text-white"
              />
            )}
            <span className="text-gray-400">downloads</span>
          </div>
        </RadioGroup>
      </div>
      
      <div>
        <Label>File Access Duration</Label>
        <RadioGroup value={formData.accessDuration === null ? "lifetime" : "limited"} onValueChange={(value) => updateFormData({ accessDuration: value === "lifetime" ? null : 30 })}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="lifetime" id="lifetime-access" />
            <Label htmlFor="lifetime-access">Lifetime access</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="limited" id="limited-access" />
            <Label htmlFor="limited-access">Access for</Label>
            {formData.accessDuration !== null && (
              <Input
                type="number"
                value={formData.accessDuration || 30}
                onChange={(e) => updateFormData({ accessDuration: parseInt(e.target.value) })}
                className="w-20 bg-[#1A1A1A] border-gray-700 text-white"
              />
            )}
            <span className="text-gray-400">days after purchase</span>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}

// STEP 3B: Physical Product Fields
function Step3BPhysical({ formData, updateFormData }: any) {
  const [newColor, setNewColor] = useState("");
  
  const addColor = () => {
    if (newColor.trim()) {
      const colors = formData.variations?.colors || [];
      updateFormData({
        variations: {
          ...formData.variations,
          colors: [...colors, newColor.trim()]
        }
      });
      setNewColor("");
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Physical Product Details</h2>
      </div>
      
      <div>
        <Label>Shipping Options</Label>
        <RadioGroup value={formData.shippingType} onValueChange={(value) => updateFormData({ shippingType: value })}>
          <div className="flex items-center space-x-2 p-4 border border-gray-700 rounded-lg">
            <RadioGroupItem value="self" id="self-ship" />
            <Label htmlFor="self-ship" className="flex-1">
              <div>
                <div className="font-semibold">I'll handle shipping</div>
                <div className="text-sm text-gray-400">You'll ship orders yourself</div>
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-2 p-4 border border-gray-700 rounded-lg">
            <RadioGroupItem value="fulfillment" id="fulfillment-ship" />
            <Label htmlFor="fulfillment-ship" className="flex-1">
              <div>
                <div className="font-semibold">Use CreatorVault fulfillment partners</div>
                <div className="text-sm text-gray-400">We'll handle shipping for you</div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>
      
      {formData.shippingType === "self" && (
        <>
          <div>
            <Label htmlFor="shippingCost">Shipping Cost (USD)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="shippingCost"
                type="number"
                value={formData.shippingCost ? formData.shippingCost / 100 : ""}
                onChange={(e) => updateFormData({ shippingCost: Math.round(parseFloat(e.target.value || "0") * 100) })}
                placeholder="5.00"
                className="bg-[#1A1A1A] border-gray-700 text-white pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="deliveryDays">Estimated Delivery (days)</Label>
            <Input
              id="deliveryDays"
              type="number"
              value={formData.estimatedDeliveryDays || 7}
              onChange={(e) => updateFormData({ estimatedDeliveryDays: parseInt(e.target.value) })}
              className="bg-[#1A1A1A] border-gray-700 text-white"
            />
          </div>
        </>
      )}
      
      <div>
        <Label>Inventory Management</Label>
        <RadioGroup value={formData.inventory === null ? "unlimited" : "limited"} onValueChange={(value) => updateFormData({ inventory: value === "unlimited" ? null : 100 })}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="unlimited" id="unlimited-inventory" />
            <Label htmlFor="unlimited-inventory">Unlimited quantity</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="limited" id="limited-inventory" />
            <Label htmlFor="limited-inventory">Limited to</Label>
            {formData.inventory !== null && (
              <Input
                type="number"
                value={formData.inventory || 100}
                onChange={(e) => updateFormData({ inventory: parseInt(e.target.value) })}
                className="w-24 bg-[#1A1A1A] border-gray-700 text-white"
              />
            )}
            <span className="text-gray-400">units</span>
          </div>
        </RadioGroup>
      </div>
      
      <div>
        <Label>Product Variations</Label>
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-gray-400">Sizes</Label>
            <div className="flex gap-2 mt-2">
              {["S", "M", "L", "XL"].map((size) => (
                <label key={size} className="flex items-center gap-2 p-2 border border-gray-700 rounded cursor-pointer hover:border-[#00AEEF]">
                  <Checkbox
                    checked={formData.variations?.sizes?.includes(size)}
                    onCheckedChange={(checked) => {
                      const sizes = formData.variations?.sizes || [];
                      updateFormData({
                        variations: {
                          ...formData.variations,
                          sizes: checked ? [...sizes, size] : sizes.filter((s: string) => s !== size)
                        }
                      });
                    }}
                  />
                  <span>{size}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <Label className="text-sm text-gray-400">Colors</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="Add color"
                className="bg-[#1A1A1A] border-gray-700 text-white"
                onKeyPress={(e) => e.key === "Enter" && addColor()}
              />
              <Button type="button" onClick={addColor} variant="outline" className="bg-transparent border-gray-700">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.variations?.colors?.map((color: string) => (
                <Badge key={color} variant="secondary" className="bg-[#7B2CBF] text-white">
                  {color}
                  <X
                    className="w-3 h-3 ml-2 cursor-pointer"
                    onClick={() => {
                      const colors = formData.variations?.colors || [];
                      updateFormData({
                        variations: {
                          ...formData.variations,
                          colors: colors.filter((c: string) => c !== color)
                        }
                      });
                    }}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// STEP 3C: Service Fields
function Step3CService({ formData, updateFormData }: any) {
  const deliveryMethodOptions = ["Video call", "Phone call", "In-person", "Delivered digitally"];
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Service Details</h2>
      </div>
      
      <div>
        <Label htmlFor="duration">Service Duration</Label>
        <div className="flex gap-2">
          <Input
            id="duration"
            type="number"
            value={formData.serviceDuration || 60}
            onChange={(e) => updateFormData({ serviceDuration: parseInt(e.target.value) })}
            className="bg-[#1A1A1A] border-gray-700 text-white"
          />
          <Select value="minutes" onValueChange={() => {}}>
            <SelectTrigger className="w-32 bg-[#1A1A1A] border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-gray-700 text-white">
              <SelectItem value="minutes">Minutes</SelectItem>
              <SelectItem value="hours">Hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label>Delivery Method</Label>
        <div className="space-y-2 mt-2">
          {deliveryMethodOptions.map((method) => (
            <label key={method} className="flex items-center gap-2 p-2 border border-gray-700 rounded cursor-pointer hover:border-[#00AEEF]">
              <Checkbox
                checked={formData.deliveryMethods?.includes(method)}
                onCheckedChange={(checked) => {
                  const methods = formData.deliveryMethods || [];
                  updateFormData({
                    deliveryMethods: checked ? [...methods, method] : methods.filter((m: string) => m !== method)
                  });
                }}
              />
              <span>{method}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
        <div>
          <Label>Enable Booking Calendar</Label>
          <p className="text-sm text-gray-400">Allow customers to book specific time slots</p>
        </div>
        <Switch
          checked={formData.bookingEnabled}
          onCheckedChange={(checked) => updateFormData({ bookingEnabled: checked })}
        />
      </div>
      
      <div>
        <Label htmlFor="turnaround">Turnaround Time (days)</Label>
        <Input
          id="turnaround"
          type="number"
          value={formData.turnaroundDays || 3}
          onChange={(e) => updateFormData({ turnaroundDays: parseInt(e.target.value) })}
          className="bg-[#1A1A1A] border-gray-700 text-white"
        />
        <p className="text-sm text-gray-400 mt-1">How long until you deliver this service?</p>
      </div>
    </div>
  );
}

// STEP 4: Images & Media
function Step4Media({ formData, updateFormData }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Images & Media</h2>
      </div>
      
      <div>
        <Label>Main Image * (1200x1200px recommended)</Label>
        <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-[#00AEEF] cursor-pointer">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400 mb-2">Upload main product image</p>
          <p className="text-sm text-gray-500">This appears in search results</p>
        </div>
      </div>
      
      <div>
        <Label>Additional Images (minimum 3, recommend 5-8)</Label>
        <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-[#00AEEF] cursor-pointer">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400 mb-2">Upload additional images</p>
          <p className="text-sm text-gray-500">Show different angles, features, or use cases</p>
        </div>
      </div>
      
      <div>
        <Label>Product Video (optional, MP4/MOV max 500MB)</Label>
        <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-[#00AEEF] cursor-pointer">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400 mb-2">Upload product video</p>
          <p className="text-sm text-gray-500">Showcase your product in action</p>
        </div>
      </div>
      
      <div className="p-4 bg-[#00AEEF]/10 border border-[#00AEEF] rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="w-6 h-6 text-[#00AEEF]" />
          <Label className="text-lg">AI Image Generator</Label>
        </div>
        <p className="text-sm text-gray-400 mb-3">Don't have product images? Generate them with AI</p>
        <Input
          placeholder="e.g., Fitness program ebook cover, modern design, electric blue and purple colors, minimalist"
          className="bg-[#1A1A1A] border-gray-700 text-white mb-3"
        />
        <Button type="button" className="bg-gradient-to-r from-[#00AEEF] to-[#7B2CBF]">
          Generate Images
        </Button>
      </div>
    </div>
  );
}

// Helper function to get step titles
function getStepTitle(step: number, type: ProductType): string {
  const titles: Record<number, string> = {
    1: "Product Type",
    2: "Basic Information",
    3: type === "digital" ? "Digital Product Details" : type === "physical" ? "Physical Product Details" : "Service Details",
    4: "Images & Media",
    5: "Pricing & Discounts",
    6: "SEO & Discovery",
    7: "Terms & Delivery",
    8: "Preview & Publish",
  };
  return titles[step] || "";
}

// STEP 5: Pricing & Discounts
function Step5Pricing({ formData, updateFormData }: any) {
  const [newKeyword, setNewKeyword] = useState("");
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Pricing & Discounts</h2>
      </div>
      
      <div>
        <Label>Base Price</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            type="number"
            value={formData.priceAmount ? formData.priceAmount / 100 : ""}
            disabled
            className="bg-[#1A1A1A] border-gray-700 text-white pl-10"
          />
        </div>
        <p className="text-sm text-gray-400 mt-1">Set in Step 2</p>
      </div>
      
      <div className="p-4 border border-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Label>Launch Discount</Label>
            <p className="text-sm text-gray-400">Offer a special price for early buyers</p>
          </div>
          <Switch
            checked={!!formData.salePrice}
            onCheckedChange={(checked) => updateFormData({ salePrice: checked ? formData.priceAmount * 0.8 : 0 })}
          />
        </div>
        
        {!!formData.salePrice && (
          <div className="space-y-4">
            <div>
              <Label>Regular Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  value={formData.regularPrice ? formData.regularPrice / 100 : formData.priceAmount / 100}
                  onChange={(e) => updateFormData({ regularPrice: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  className="bg-[#1A1A1A] border-gray-700 text-white pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label>Sale Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  value={formData.salePrice ? formData.salePrice / 100 : ""}
                  onChange={(e) => updateFormData({ salePrice: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  className="bg-[#1A1A1A] border-gray-700 text-white pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label>Sale End Date</Label>
              <Input
                type="date"
                value={formData.saleEndDate ? new Date(formData.saleEndDate).toISOString().split('T')[0] : ""}
                onChange={(e) => updateFormData({ saleEndDate: new Date(e.target.value) })}
                className="bg-[#1A1A1A] border-gray-700 text-white"
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 border border-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Label>Subscription Option</Label>
            <p className="text-sm text-gray-400">Offer monthly recurring payments</p>
          </div>
          <Switch
            checked={!!formData.monthlyPrice}
            onCheckedChange={(checked) => updateFormData({ monthlyPrice: checked ? Math.round(formData.priceAmount * 0.3) : 0 })}
          />
        </div>
        
        {!!formData.monthlyPrice && (
          <div>
            <Label>Monthly Price</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                type="number"
                value={formData.monthlyPrice ? formData.monthlyPrice / 100 : ""}
                onChange={(e) => updateFormData({ monthlyPrice: Math.round(parseFloat(e.target.value || "0") * 100) })}
                className="bg-[#1A1A1A] border-gray-700 text-white pl-10"
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">
              One-time: ${(formData.priceAmount / 100).toFixed(2)} | Monthly: ${(formData.monthlyPrice / 100).toFixed(2)}/mo
            </p>
          </div>
        )}
      </div>
      
      <div className="p-4 bg-[#00AEEF]/10 border border-[#00AEEF] rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="w-6 h-6 text-[#00AEEF]" />
          <Label className="text-lg">AI Pricing Optimizer</Label>
        </div>
        <p className="text-sm text-gray-400 mb-3">Get AI-powered pricing recommendations</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Suggested price:</span>
            <span className="text-white font-semibold">$29-$49</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Category average:</span>
            <span className="text-white">$39</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Top sellers price at:</span>
            <span className="text-white">$47</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// STEP 6: SEO & Discovery
function Step6SEO({ formData, updateFormData }: any) {
  const [newKeyword, setNewKeyword] = useState("");
  
  const addKeyword = () => {
    if (newKeyword.trim()) {
      const keywords = formData.keywords || [];
      updateFormData({ keywords: [...keywords, newKeyword.trim()] });
      setNewKeyword("");
    }
  };
  
  const targetAudienceOptions = ["My existing fans", "All CreatorVault users", "United States", "Canada", "United Kingdom", "Dominican Republic"];
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">SEO & Discovery</h2>
      </div>
      
      <div>
        <Label>Search Keywords</Label>
        <div className="flex gap-2 mt-2">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="Add keyword"
            className="bg-[#1A1A1A] border-gray-700 text-white"
            onKeyPress={(e) => e.key === "Enter" && addKeyword()}
          />
          <Button type="button" onClick={addKeyword} variant="outline" className="bg-transparent border-gray-700">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.keywords?.map((keyword: string) => (
            <Badge key={keyword} variant="secondary" className="bg-[#00AEEF] text-white">
              {keyword}
              <X
                className="w-3 h-3 ml-2 cursor-pointer"
                onClick={() => {
                  const keywords = formData.keywords || [];
                  updateFormData({ keywords: keywords.filter((k: string) => k !== keyword) });
                }}
              />
            </Badge>
          ))}
        </div>
      </div>
      
      <div>
        <Label>Target Audience</Label>
        <div className="space-y-2 mt-2">
          {targetAudienceOptions.map((option) => (
            <label key={option} className="flex items-center gap-2 p-2 border border-gray-700 rounded cursor-pointer hover:border-[#00AEEF]">
              <Checkbox
                checked={formData.targetAudience?.includes(option)}
                onCheckedChange={(checked) => {
                  const audience = formData.targetAudience || [];
                  updateFormData({
                    targetAudience: checked ? [...audience, option] : audience.filter((a: string) => a !== option)
                  });
                }}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div>
        <Label>Content Rating</Label>
        <RadioGroup value={formData.contentRating} onValueChange={(value) => updateFormData({ contentRating: value })}>
          <div className="flex items-center space-x-2 p-3 border border-gray-700 rounded">
            <RadioGroupItem value="general" id="rating-general" />
            <Label htmlFor="rating-general">General audience</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 border border-gray-700 rounded">
            <RadioGroupItem value="18+" id="rating-18" />
            <Label htmlFor="rating-18">18+ (Adult content)</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 border border-gray-700 rounded">
            <RadioGroupItem value="21+" id="rating-21" />
            <Label htmlFor="rating-21">21+ (Mature content)</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}

// STEP 7: Terms & Delivery
function Step7Terms({ formData, updateFormData }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Terms & Delivery</h2>
      </div>
      
      <div>
        <Label>Refund Policy</Label>
        <RadioGroup value={formData.refundPolicy} onValueChange={(value) => updateFormData({ refundPolicy: value })}>
          <div className="flex items-center space-x-2 p-3 border border-gray-700 rounded">
            <RadioGroupItem value="no-refunds" id="no-refunds" />
            <Label htmlFor="no-refunds">No refunds</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 border border-gray-700 rounded">
            <RadioGroupItem value="7-day" id="7-day" />
            <Label htmlFor="7-day">7-day money-back guarantee</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 border border-gray-700 rounded">
            <RadioGroupItem value="30-day" id="30-day" />
            <Label htmlFor="30-day">30-day money-back guarantee</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 border border-gray-700 rounded">
            <RadioGroupItem value="custom" id="custom-refund" />
            <Label htmlFor="custom-refund">Custom policy</Label>
          </div>
        </RadioGroup>
        
        {formData.refundPolicy === "custom" && (
          <Textarea
            value={formData.customRefundPolicy || ""}
            onChange={(e) => updateFormData({ customRefundPolicy: e.target.value })}
            placeholder="Describe your custom refund policy"
            className="bg-[#1A1A1A] border-gray-700 text-white mt-2"
            rows={4}
          />
        )}
      </div>
      
      <div>
        <Label>Customer Instructions (optional)</Label>
        <Textarea
          value={formData.customerInstructions || ""}
          onChange={(e) => updateFormData({ customerInstructions: e.target.value })}
          placeholder="What should customers know after purchase? (e.g., how to access files, what to expect, etc.)"
          className="bg-[#1A1A1A] border-gray-700 text-white"
          rows={4}
        />
      </div>
      
      {formData.type === "digital" && (
        <div>
          <Label>Terms of Use</Label>
          <RadioGroup value={formData.termsOfUse || "personal"} onValueChange={(value) => updateFormData({ termsOfUse: value })}>
            <div className="flex items-center space-x-2 p-3 border border-gray-700 rounded">
              <RadioGroupItem value="personal" id="personal-use" />
              <Label htmlFor="personal-use">Personal use only</Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border border-gray-700 rounded">
              <RadioGroupItem value="commercial" id="commercial-use" />
              <Label htmlFor="commercial-use">Commercial use allowed</Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border border-gray-700 rounded">
              <RadioGroupItem value="custom-license" id="custom-license" />
              <Label htmlFor="custom-license">Custom license</Label>
            </div>
          </RadioGroup>
          
          {formData.termsOfUse === "custom-license" && (
            <Textarea
              value={formData.termsOfUse || ""}
              onChange={(e) => updateFormData({ termsOfUse: e.target.value })}
              placeholder="Describe your custom license terms"
              className="bg-[#1A1A1A] border-gray-700 text-white mt-2"
              rows={4}
            />
          )}
        </div>
      )}
    </div>
  );
}

// STEP 8: Preview & Publish
function Step8Preview({ formData, updateFormData }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Preview & Publish</h2>
      </div>
      
      <div>
        <Label className="text-lg mb-4 block">Product Card Preview</Label>
        <Card className="bg-[#1A1A1A] border-gray-800 max-w-sm">
          <CardHeader className="p-0">
            <div className="aspect-square bg-gray-800 rounded-t-lg flex items-center justify-center">
              {formData.mainImage ? (
                <img src={formData.mainImage} alt={formData.title} className="w-full h-full object-cover rounded-t-lg" />
              ) : (
                <Package className="w-16 h-16 text-gray-600" />
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <h3 className="font-semibold text-white mb-2">{formData.title || "Product Title"}</h3>
            <p className="text-sm text-gray-400 mb-3 line-clamp-2">{formData.shortDescription || "Short description will appear here"}</p>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-[#00AEEF]">
                ${((formData.salePrice || formData.priceAmount) / 100).toFixed(2)}
                {formData.salePrice && (
                  <span className="text-sm text-gray-400 line-through ml-2">
                    ${(formData.priceAmount / 100).toFixed(2)}
                  </span>
                )}
              </div>
              <Badge variant="secondary" className="bg-[#7B2CBF] text-white">New</Badge>
            </div>
            <div className="text-sm text-gray-400 mt-2">0 sales</div>
          </CardContent>
        </Card>
      </div>
      
      <div>
        <Label>Publishing Options</Label>
        <RadioGroup value={formData.publishOption} onValueChange={(value) => updateFormData({ publishOption: value })}>
          <div className="flex items-center space-x-2 p-3 border border-gray-700 rounded">
            <RadioGroupItem value="immediate" id="publish-immediate" />
            <Label htmlFor="publish-immediate">Publish immediately</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 border border-gray-700 rounded">
            <RadioGroupItem value="scheduled" id="publish-scheduled" />
            <Label htmlFor="publish-scheduled">Schedule for later</Label>
          </div>
          <div className="flex items-center space-x-2 p-3 border border-gray-700 rounded">
            <RadioGroupItem value="draft" id="publish-draft" />
            <Label htmlFor="publish-draft">Save as draft</Label>
          </div>
        </RadioGroup>
        
        {formData.publishOption === "scheduled" && (
          <div className="mt-4">
            <Label>Schedule Date & Time</Label>
            <Input
              type="datetime-local"
              value={formData.scheduledFor ? new Date(formData.scheduledFor).toISOString().slice(0, 16) : ""}
              onChange={(e) => updateFormData({ scheduledFor: new Date(e.target.value) })}
              className="bg-[#1A1A1A] border-gray-700 text-white"
            />
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <label className="flex items-center gap-2 p-3 border border-gray-700 rounded cursor-pointer hover:border-[#00AEEF]">
          <Checkbox
            checked={formData.notifySubscribers}
            onCheckedChange={(checked) => updateFormData({ notifySubscribers: checked })}
          />
          <span>Notify my subscribers about this product</span>
        </label>
        
        <label className="flex items-center gap-2 p-3 border border-gray-700 rounded cursor-pointer hover:border-[#00AEEF]">
          <Checkbox
            checked={formData.shareOnSocial}
            onCheckedChange={(checked) => updateFormData({ shareOnSocial: checked })}
          />
          <span>Share on my social media automatically</span>
        </label>
      </div>
    </div>
  );
}
