export const emailRules = [
  { required: true, message: "Vui lòng nhập email." },
  { type: "email", transform: (value) => value?.trim(), message: "Email không hợp lệ." },
  { max: 254, message: "Email tối đa 254 ký tự." },
];

export const newPasswordRules = [
  { required: true, message: "Vui lòng nhập mật khẩu." },
  { min: 8, message: "Mật khẩu cần ít nhất 8 ký tự." },
  { max: 128, message: "Mật khẩu tối đa 128 ký tự." },
];

export function confirmPasswordRule(field) {
  return ({ getFieldValue }) => ({
    validator(_, value) {
      if (!value || getFieldValue(field) === value) return Promise.resolve();
      return Promise.reject(new Error("Mật khẩu xác nhận chưa khớp."));
    },
  });
}
