import type { Service } from "../services/services";

type ServiceList = Service[];

export interface ServiceFilterStrategy {
  apply(services: ServiceList): ServiceList;
}

export class NoopFilterStrategy implements ServiceFilterStrategy {
  apply(services: ServiceList): ServiceList {
    return services;
  }
}

export class AvailabilityFilterStrategy implements ServiceFilterStrategy {
  constructor(private onlyAvailable: boolean) {}

  apply(services: ServiceList): ServiceList {
    if (!this.onlyAvailable) return services;
    return services.filter((service) => service.active);
  }
}

export class PriceRangeFilterStrategy implements ServiceFilterStrategy {
  constructor(private min?: number, private max?: number) {}

  apply(services: ServiceList): ServiceList {
    if (typeof this.min !== "number" && typeof this.max !== "number") {
      return services;
    }
    return services.filter((service) => {
      const effectivePrice = service.price_to_agree ? 0 : service.price;
      if (typeof this.min === "number" && effectivePrice < this.min) return false;
      if (typeof this.max === "number" && effectivePrice > this.max) return false;
      return true;
    });
  }
}

export class CompositeFilterStrategy implements ServiceFilterStrategy {
  constructor(private strategies: ServiceFilterStrategy[]) {}

  apply(services: ServiceList): ServiceList {
    return this.strategies.reduce((acc, strategy) => strategy.apply(acc), services);
  }
}
