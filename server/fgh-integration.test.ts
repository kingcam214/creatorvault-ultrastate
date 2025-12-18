import { describe, it, expect, beforeAll } from "vitest";
import {
  createProduct,
  listProducts,
  createCourse,
  listCourses,
  createServiceOffer,
  listServiceOffers,
  createOrder,
  listOrders,
  createCommissionEvent,
} from "./db-fgh";

describe("Systems F/G/H Integration Tests", () => {
  let testCreatorId: number;
  let testProductId: string;
  let testCourseId: string;
  let testServiceId: string;

  beforeAll(() => {
    // Use a test creator ID
    testCreatorId = 999;
  });

  it("should create a product and retrieve it", async () => {
    // Create product
    await createProduct({
      creatorId: testCreatorId,
      title: "Test Product",
      description: "Test Description",
      type: "digital",
      priceAmount: 1000, // $10.00
      currency: "USD",
      fulfillmentType: "manual",
    });

    // Retrieve products
    const products = await listProducts({ status: "active" });
    const testProduct = products.find(p => p.title === "Test Product");

    expect(testProduct).toBeDefined();
    expect(testProduct?.priceAmount).toBe(1000);
    expect(testProduct?.currency).toBe("USD");

    if (testProduct) {
      testProductId = testProduct.id;
    }
  });

  it("should create a course and retrieve it", async () => {
    // Create course
    await createCourse({
      creatorId: testCreatorId,
      title: "Test Course",
      description: "Test Course Description",
      priceAmount: 5000, // $50.00
      currency: "USD",
      isFree: false,
    });

    // Retrieve courses
    const courses = await listCourses({ status: "active" });
    const testCourse = courses.find(c => c.title === "Test Course");

    expect(testCourse).toBeDefined();
    expect(testCourse?.priceAmount).toBe(5000);
    expect(testCourse?.isFree).toBe(false);

    if (testCourse) {
      testCourseId = testCourse.id;
    }
  });

  it("should create a service and retrieve it", async () => {
    // Create service
    await createServiceOffer({
      providerId: testCreatorId,
      title: "Test Service",
      description: "Test Service Description",
      tier: "mid",
      priceAmount: 100000, // $1000.00
      currency: "USD",
      deliveryDays: 7,
    });

    // Retrieve services
    const services = await listServiceOffers({ status: "active" });
    const testService = services.find(s => s.title === "Test Service");

    expect(testService).toBeDefined();
    expect(testService?.tier).toBe("mid");
    expect(testService?.priceAmount).toBe(100000);

    if (testService) {
      testServiceId = testService.id;
    }
  });

  it("should create an order for a product", async () => {
    if (!testProductId) {
      throw new Error("No test product ID available");
    }

    await createOrder({
      buyerId: 888,
      productId: testProductId,
      totalAmount: 1000,
      currency: "USD",
      status: "pending",
    });

    const orders = await listOrders({ buyerId: 888 });
    const testOrder = orders.find(o => o.productId === testProductId);

    expect(testOrder).toBeDefined();
    expect(testOrder?.totalAmount).toBe(1000);
    expect(testOrder?.status).toBe("pending");
  });

  it("should log commission events", async () => {
    await createCommissionEvent({
      orderId: "test-order-123",
      recipientId: testCreatorId,
      recipientType: "creator",
      amount: 700, // 70% of $10
      currency: "USD",
      status: "pending",
    });

    // Just verify it doesn't throw
    expect(true).toBe(true);
  });
});
