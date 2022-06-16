import {
  Directive,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
  ViewContainerRef,
} from "@angular/core";
import { FormBuilder } from "@angular/forms";

import { ApiService } from "@bitwarden/common/abstractions/api.service";
import { CryptoService } from "@bitwarden/common/abstractions/crypto.service";
import { EventService } from "@bitwarden/common/abstractions/event.service";
import { ExportService } from "@bitwarden/common/abstractions/export.service";
import { I18nService } from "@bitwarden/common/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/abstractions/log.service";
import { PlatformUtilsService } from "@bitwarden/common/abstractions/platformUtils.service";
import { PolicyService } from "@bitwarden/common/abstractions/policy.service";
import { StateService } from "@bitwarden/common/abstractions/state.service";
import { UserVerificationService } from "@bitwarden/common/abstractions/userVerification.service";
import { EventType } from "@bitwarden/common/enums/eventType";
import { PolicyType } from "@bitwarden/common/enums/policyType";

import { ModalService } from "../services/modal.service";

@Directive()
export class ExportComponent implements OnInit {
  @Output() onSaved = new EventEmitter();

  formPromise: Promise<string>;
  disabledByPolicy = false;
  private alreadyVerified = false;

  @ViewChild("viewUserApiKeyTemplate", { read: ViewContainerRef, static: true })
  viewUserApiKeyModalRef: ViewContainerRef;

  encryptionPassword: string;

  exportForm = this.formBuilder.group({
    format: ["json"],
    secret: [""],
    password: [""],
    confirmPassword: [""],
    fileEncryptionType: [""],
  });

  formatOptions = [
    { name: ".json", value: "json" },
    { name: ".csv", value: "csv" },
    { name: ".json (Encrypted)", value: "encrypted_json" },
  ];

  constructor(
    protected cryptoService: CryptoService,
    protected i18nService: I18nService,
    protected platformUtilsService: PlatformUtilsService,
    protected exportService: ExportService,
    protected eventService: EventService,
    private policyService: PolicyService,
    protected win: Window,
    private logService: LogService,
    private userVerificationService: UserVerificationService,
    private formBuilder: FormBuilder,
    protected modalService: ModalService,
    protected apiService: ApiService,
    protected stateService: StateService
  ) {}

  async ngOnInit() {
    await this.checkExportDisabled();
  }

  async checkExportDisabled() {
    this.disabledByPolicy = await this.policyService.policyAppliesToUser(
      PolicyType.DisablePersonalVaultExport
    );
    if (this.disabledByPolicy) {
      this.exportForm.disable();
    }
  }

  get encryptedFormat() {
    return this.format === "encrypted_json";
  }

  async submitWithSecretAlreadyVerified() {
    if (!this.validForm) {
      return;
    }

    this.alreadyVerified = true;
    this.submit();
  }

  async submit() {
    if (this.disabledByPolicy) {
      this.platformUtilsService.showToast(
        "error",
        null,
        this.i18nService.t("personalVaultExportPolicyInEffect")
      );
      return;
    }

    if (!this.alreadyVerified) {
      const acceptedWarning = await this.warningDialog();
      if (!acceptedWarning) {
        return;
      }
      const secret = this.exportForm.get("secret").value;

      try {
        await this.userVerificationService.verifyUser(secret);
      } catch (e) {
        this.platformUtilsService.showToast(
          "error",
          this.i18nService.t("errorOccurred"),
          e.message
        );
        return;
      }
    }
    try {
      this.formPromise = this.getExportData();
      const data = await this.formPromise;
      this.downloadFile(data);
      this.saved();
      await this.collectEvent();
      this.exportForm.get("secret").setValue("");
    } catch (e) {
      this.logService.error(e);
    }
  }

  async warningDialog() {
    if (this.encryptedFormat) {
      return await this.platformUtilsService.showDialog(
        "<p>" +
          this.i18nService.t("encExportKeyWarningDesc") +
          "<p>" +
          this.i18nService.t("encExportAccountWarningDesc"),
        this.i18nService.t("confirmVaultExport"),
        this.i18nService.t("exportVault"),
        this.i18nService.t("cancel"),
        "warning",
        true
      );
    } else {
      return await this.platformUtilsService.showDialog(
        this.i18nService.t("exportWarningDesc"),
        this.i18nService.t("confirmVaultExport"),
        this.i18nService.t("exportVault"),
        this.i18nService.t("cancel"),
        "warning"
      );
    }
  }

  protected saved() {
    this.onSaved.emit();
  }

  protected getExportData() {
    return this.exportService.getExport(this.format, null, this.encryptionPassword);
  }

  protected getFileName(prefix?: string) {
    let extension = this.format;
    if (this.format === "encrypted_json") {
      if (prefix == null) {
        prefix = "encrypted";
      } else {
        prefix = "encrypted_" + prefix;
      }
      extension = "json";
    }
    return this.exportService.getFileName(prefix, extension);
  }

  protected async collectEvent(): Promise<any> {
    await this.eventService.collect(EventType.User_ClientExportedVault);
  }

  get validForm() {
    //TODO check if fileEncryption type is null?
    if (this.fileEncryptionType == 2 && this.format == "encrypted_json") {
      //password encryption type
      const password = this.password;
      const confirmPassword = this.confirmPassword;

      if (password.length > 0 || confirmPassword.length > 0) {
        if (password != confirmPassword) {
          this.platformUtilsService.showToast(
            "error",
            this.i18nService.t("errorOccurred"),
            "File Password and Confirm File Password do not match."
          );
          return false;
        }

        this.encryptionPassword = password;
        return true;
      }
    } else {
      this.clearPasswordField();
      return true;
    }
  }

  protected clearPasswordField() {
    this.encryptionPassword = "";
  }

  get format() {
    return this.exportForm.get("format").value;
  }

  get password() {
    return this.exportForm.get("password").value;
  }

  get confirmPassword() {
    return this.exportForm.get("confirmPassword").value;
  }

  get fileEncryptionType() {
    return this.exportForm.get("fileEncryptionType").value;
  }

  private downloadFile(csv: string): void {
    const fileName = this.getFileName();
    this.platformUtilsService.saveFile(this.win, csv, { type: "text/plain" }, fileName);
  }
}