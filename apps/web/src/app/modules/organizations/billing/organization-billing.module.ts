import { NgModule } from "@angular/core";

import { LooseComponentsModule } from "../../loose-components.module";
import { SharedModule } from "../../shared.module";

import { BillingSyncApiKeyComponent } from "./billing-sync-api-key.component";
import { OrganizationBillingHistoryComponent } from "./organization-billing-history.component";
import { OrganizationBillingTabComponent } from "./organization-billing-tab.component";
import { OrganizationPaymentMethodComponent } from "./organization-payment-method.component";
import { OrganizationSubscriptionComponent } from "./organization-subscription.component";

@NgModule({
  imports: [SharedModule, LooseComponentsModule],
  declarations: [
    BillingSyncApiKeyComponent,
    OrganizationBillingHistoryComponent,
    OrganizationBillingTabComponent,
    OrganizationPaymentMethodComponent,
    OrganizationSubscriptionComponent,
  ],
  exports: [
    BillingSyncApiKeyComponent,
    OrganizationBillingHistoryComponent,
    OrganizationBillingTabComponent,
    OrganizationPaymentMethodComponent,
    OrganizationSubscriptionComponent,
  ],
})
export class OrganizationBillingModule {}
